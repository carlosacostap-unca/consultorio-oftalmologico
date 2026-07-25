import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const ENV_PATH = argValue("--env") || ".env.local";
const FICHAS_PATH = argValue("--fichas") || path.join("data", "import-datomed-fichas-2026-06-16.txt");
const PB_PER_PAGE = 500;
const CREATE_CONCURRENCY = 5;
const DELETE_CONCURRENCY = 8;
const ACTIVE_PATIENT_FILTER = 'estado_registro != "fusionado"';
const env = loadEnv(ENV_PATH);
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const token = await adminToken();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

fs.mkdirSync("reports", { recursive: true });

const fichas = readFichaList(FICHAS_PATH);
const datomedRowsByFicha = readDatomedRowsByFicha(path.join("data", "DATOMED.DBF"));
const patients = await fetchPatientsByFichas(fichas);
const patientsByFicha = new Map();
for (const patient of patients) {
  const ficha = normalizeFicha(patient.numero_ficha);
  const list = patientsByFicha.get(ficha) || [];
  list.push(patient);
  patientsByFicha.set(ficha, list);
}

const medicoId = await resolveImportMedicoId();
const operations = [];
const blockers = [];

for (const ficha of fichas) {
  const datomedRows = datomedRowsByFicha.get(ficha) || [];
  const fichaPatients = patientsByFicha.get(ficha) || [];

  if (datomedRows.length === 0) {
    blockers.push({ ficha, reason: "DATOMED.DBF no tiene consultas para la ficha", patients: fichaPatients.map(summaryPatient) });
    continue;
  }

  if (fichaPatients.length === 0) {
    blockers.push({ ficha, reason: "No hay paciente activo con ese numero de ficha", datomedRows: datomedRows.length });
    continue;
  }

  if (fichaPatients.length > 1) {
    blockers.push({
      ficha,
      reason: "Hay mas de un paciente activo con ese numero de ficha",
      datomedRows: datomedRows.length,
      patients: fichaPatients.map(summaryPatient),
    });
    continue;
  }

  const patient = fichaPatients[0];
  const existingConsultas = await listAll("consultas", {
    filter: `paciente_id = "${escapeFilterValue(patient.id)}"`,
    fields: "id,paciente_id,numero_ficha,fecha,motivo_consulta,diagnostico,tratamiento,estado,medico_id,created,updated",
    sort: "fecha",
  });
  const legacyConsultas = existingConsultas.filter(isLegacyConsulta);
  const nonLegacyConsultas = existingConsultas.filter((consulta) => !isLegacyConsulta(consulta));

  if (nonLegacyConsultas.length > 0) {
    blockers.push({
      ficha,
      reason: "El paciente ya tiene consultas no-Legacy; no se importo para evitar duplicados",
      datomedRows: datomedRows.length,
      patient: summaryPatient(patient),
      existingConsultas: existingConsultas.length,
      legacyConsultas: legacyConsultas.length,
      nonLegacyConsultas: nonLegacyConsultas.length,
      sampleNonLegacy: nonLegacyConsultas.slice(0, 5).map(summaryConsulta),
    });
    continue;
  }

  operations.push({
    ficha,
    patient,
    datomedRows: datomedRows.length,
    existingConsultas: existingConsultas.length,
    legacyConsultas: legacyConsultas.length,
  });
}

const summary = {
  createdAt: new Date().toISOString(),
  mode: APPLY ? "apply" : "dry-run",
  pocketBaseUrl: PB_URL,
  fichasSolicitadas: fichas.length,
  operations: operations.length,
  blockers: blockers.length,
  consultasToImport: operations.reduce((sum, operation) => sum + operation.datomedRows, 0),
  legacyConsultasToDelete: operations.reduce((sum, operation) => sum + operation.legacyConsultas, 0),
  medicoId,
  reportPolicy: "Solo se procesan fichas con un unico paciente activo y sin consultas no-Legacy existentes.",
  sampleOperations: operations.slice(0, 30).map(summaryOperation),
  sampleBlockers: blockers.slice(0, 80),
};

const reportPath = path.join("reports", `importar-datomed-fichas-${timestamp}.json`);
fs.writeFileSync(reportPath, JSON.stringify({ ...summary, operations: operations.map(summaryOperation), blockers }, null, 2), "utf8");

console.log(`Modo: ${APPLY ? "APPLY" : "DRY-RUN"}`);
console.log(`Fichas solicitadas: ${summary.fichasSolicitadas}`);
console.log(`Operaciones posibles: ${summary.operations}`);
console.log(`Bloqueos: ${summary.blockers}`);
console.log(`Consultas a importar desde DATOMED.DBF: ${summary.consultasToImport}`);
console.log(`Consultas Legacy a reemplazar: ${summary.legacyConsultasToDelete}`);
console.log(`Medico asignado: ${medicoId || "SIN MEDICO"}`);
console.log(`Reporte: ${reportPath}`);

if (!APPLY) {
  console.log("Dry-run finalizado. Reejecuta con --apply para modificar datos.");
  process.exit();
}

if (!medicoId) {
  throw new Error("No hay un medico disponible para asignar a las consultas importadas.");
}

const backup = await buildBackup(operations);
const backupDir = path.join("data", "backups", "importar-datomed-fichas");
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `${timestamp}-backup.json`);
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
console.log(`Backup global: ${backupPath}`);

let applied = 0;
const results = await mapWithConcurrency(operations, 3, async (operation) => {
  const result = await applyOperation(operation, backup.byPatient[operation.patient.id]);
  applied += 1;
  if (applied % 25 === 0 || applied === operations.length) {
    console.log(`[${applied}/${operations.length}] pacientes procesados`);
  }
  return result;
});

const verification = await verifyResults(results);
const resultPath = path.join("reports", `importar-datomed-fichas-${timestamp}-resultado.json`);
fs.writeFileSync(resultPath, JSON.stringify({ ...summary, backupPath, results, blockers, verification }, null, 2), "utf8");
console.log(`Resultado: ${resultPath}`);
console.log(`Verificacion OK: ${verification.ok}`);

async function applyOperation(operation, backupEntry) {
  const rows = datomedRowsByFicha.get(operation.ficha) || [];
  const createdConsultas = await mapWithConcurrency(rows, CREATE_CONCURRENCY, (row) => (
    pb("/api/collections/consultas/records", {
      method: "POST",
      body: JSON.stringify(normalizeOptionalClinicalZeros({
        ...row.payload,
        paciente_id: operation.patient.id,
        numero_ficha: operation.ficha,
        medico_id: medicoId,
      })),
    })
  ));

  await mapWithConcurrency(backupEntry.consultaEventos, DELETE_CONCURRENCY, (event) => deleteRecord("consulta_eventos", event.id));
  await mapWithConcurrency(backupEntry.legacyConsultas, DELETE_CONCURRENCY, (consulta) => deleteRecord("consultas", consulta.id));

  return {
    ficha: operation.ficha,
    patient: summaryPatient(operation.patient),
    importedConsultas: createdConsultas.length,
    deletedLegacyConsultas: backupEntry.legacyConsultas.length,
    deletedConsultaEventos: backupEntry.consultaEventos.length,
    createdConsultaIds: createdConsultas.map((consulta) => consulta.id),
  };
}

async function buildBackup(plannedOperations) {
  const byPatient = Object.fromEntries(plannedOperations.map((operation) => [
    operation.patient.id,
    {
      operation: summaryOperation(operation),
      patient: operation.patient,
      consultas: [],
      legacyConsultas: [],
      consultaEventos: [],
    },
  ]));

  const patientIds = plannedOperations.map((operation) => operation.patient.id);
  const consultas = [];
  for (const chunk of chunks(patientIds, 50)) {
    const filter = chunk.map((id) => `paciente_id = "${escapeFilterValue(id)}"`).join(" || ");
    consultas.push(...await listAll("consultas", {
      filter,
      fields: "id,paciente_id,numero_ficha,fecha,motivo_consulta,diagnostico,tratamiento,estado,medico_id,created,updated",
    }));
  }

  for (const consulta of consultas) {
    const entry = byPatient[consulta.paciente_id];
    if (!entry) continue;
    entry.consultas.push(consulta);
    if (isLegacyConsulta(consulta)) entry.legacyConsultas.push(consulta);
  }

  const legacyIds = consultas.filter(isLegacyConsulta).map((consulta) => consulta.id);
  const consultaEventos = [];
  for (const chunk of chunks(legacyIds, 35)) {
    if (chunk.length === 0) continue;
    const filter = chunk.map((id) => `consulta_id = "${escapeFilterValue(id)}"`).join(" || ");
    consultaEventos.push(...await listAll("consulta_eventos", {
      filter,
      fields: "id,consulta_id,paciente_id,tipo,titulo,detalle,metadata,actor_id,actor_nombre,created,updated",
      allowMissingCollection: true,
    }));
  }

  const patientIdByConsultaId = new Map(consultas.map((consulta) => [consulta.id, consulta.paciente_id]));
  for (const event of consultaEventos) {
    const patientId = event.paciente_id || patientIdByConsultaId.get(event.consulta_id);
    const entry = byPatient[patientId];
    if (entry) entry.consultaEventos.push(event);
  }

  return {
    createdAt: new Date().toISOString(),
    pocketBaseUrl: PB_URL,
    operations: plannedOperations.map(summaryOperation),
    byPatient,
  };
}

async function verifyResults(results) {
  const checks = [];
  for (const chunk of chunks(results, 40)) {
    const filter = chunk.map((result) => `paciente_id = "${escapeFilterValue(result.patient.id)}"`).join(" || ");
    const consultas = await listAll("consultas", {
      filter,
      fields: "id,paciente_id,numero_ficha,motivo_consulta",
    });
    const byPatient = groupBy(consultas, (consulta) => consulta.paciente_id);
    for (const result of chunk) {
      const current = byPatient.get(result.patient.id) || [];
      checks.push({
        ficha: result.ficha,
        patientId: result.patient.id,
        expectedImported: result.importedConsultas,
        currentConsultas: current.length,
        currentLegacyConsultas: current.filter(isLegacyConsulta).length,
        ok: current.length === result.importedConsultas && current.filter(isLegacyConsulta).length === 0,
      });
    }
  }
  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

async function fetchPatientsByFichas(targetFichas) {
  const patients = [];
  for (const chunk of chunks(targetFichas, 45)) {
    const fichaFilter = chunk.map((ficha) => `numero_ficha = "${escapeFilterValue(ficha)}"`).join(" || ");
    patients.push(...await listAll("pacientes", {
      filter: `(${ACTIVE_PATIENT_FILTER}) && (${fichaFilter})`,
      fields: "id,nombre,apellido,tipo_documento,numero_documento,dni,telefono,email,obra_social,numero_ficha,estado_registro",
      sort: "numero_ficha,apellido,nombre",
    }));
  }
  return patients;
}

async function resolveImportMedicoId() {
  const result = await listAll("users", {
    fields: "id,email,name,role,roles",
    sort: "name,email",
  });
  const medico = result.find((user) => normalizeUserRoles(user).includes("medico"));
  return medico?.id || "";
}

function readDatomedRowsByFicha(dbfPath) {
  if (!fs.existsSync(dbfPath)) throw new Error(`No se encontro ${dbfPath}`);

  const buffer = fs.readFileSync(dbfPath);
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields = readDbfFields(buffer, headerLength);
  const fieldByName = new Map(fields.map((field) => [field.name, field]));
  const required = (name) => requiredField(fieldByName, name);
  const rowsByFicha = new Map();

  for (let index = 0; index < recordCount; index += 1) {
    const recordOffset = headerLength + index * recordLength;
    if (buffer[recordOffset] === 0x2a) continue;

    const ficha = normalizeFicha(readDbfField(buffer, recordOffset, required("NUM_FICH")));
    if (!ficha) continue;

    const rows = rowsByFicha.get(ficha) || [];
    rows.push({
      sourceIndex: index + 1,
      payload: {
        numero_ficha: ficha,
        fecha: parseDbfDate(readDbfField(buffer, recordOffset, required("MED_FEC"))),
        motivo_consulta: cleanDbfValue(readDbfField(buffer, recordOffset, required("MOT_CONS"))),
        av_sc_od: cleanDbfValue(readDbfField(buffer, recordOffset, required("AG_VI_SCD"))),
        av_sc_oi: cleanDbfValue(readDbfField(buffer, recordOffset, required("AG_VI_SCI"))),
        av_cc_od: cleanDbfValue(readDbfField(buffer, recordOffset, required("AG_VI_CCD"))),
        av_cc_oi: cleanDbfValue(readDbfField(buffer, recordOffset, required("AG_VI_CCI"))),
        ref_lejos_od_esf: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_ESF_D"))),
        ref_lejos_od_cil: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_CIL_D"))),
        ref_lejos_od_eje: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_GRA_D"))),
        ref_lejos_oi_esf: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_ESF_I"))),
        ref_lejos_oi_cil: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_CIL_I"))),
        ref_lejos_oi_eje: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_GRA_I"))),
        ref_cerca_od_esf: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_ESF_D"))),
        ref_cerca_od_cil: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_CIL_D"))),
        ref_cerca_od_eje: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_GRA_D"))),
        ref_cerca_oi_esf: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_ESF_I"))),
        ref_cerca_oi_cil: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_CIL_I"))),
        ref_cerca_oi_eje: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_GRA_I"))),
        pio_od: cleanDbfValue(readDbfField(buffer, recordOffset, required("PRE_OCU_D"))),
        pio_oi: cleanDbfValue(readDbfField(buffer, recordOffset, required("PRE_OCU_I"))),
        fondo_ojo: cleanDbfValue(readDbfField(buffer, recordOffset, required("FONDO_OJO"))),
        tratamiento: cleanDbfValue(readDbfField(buffer, recordOffset, required("TRATA"))),
        diagnostico: cleanDbfValue(readDbfField(buffer, recordOffset, required("MED_DIAG"))),
        estado: "finalizada",
      },
    });
    rowsByFicha.set(ficha, rows);
  }

  for (const rows of rowsByFicha.values()) {
    rows.sort((a, b) => a.payload.fecha.localeCompare(b.payload.fecha) || a.sourceIndex - b.sourceIndex);
  }

  return rowsByFicha;
}

function readDbfFields(buffer, headerLength) {
  const fields = [];
  let offset = 32;
  let position = 1;

  while (offset < headerLength && buffer[offset] !== 0x0d) {
    const name = buffer.subarray(offset, offset + 11).toString("ascii").replace(/\0.*$/, "").trim();
    const length = buffer[offset + 16];
    fields.push({ name, length, position });
    position += length;
    offset += 32;
  }

  return fields;
}

function readDbfField(buffer, recordOffset, field) {
  const start = recordOffset + field.position;
  const end = start + field.length;
  return buffer.subarray(start, end).toString("latin1");
}

function requiredField(fieldByName, name) {
  const field = fieldByName.get(name);
  if (!field) throw new Error(`El DBF no contiene el campo ${name}.`);
  return field;
}

function cleanDbfValue(value) {
  return value.trim().replace(/\s+/g, " ");
}

function parseDbfDate(value) {
  const cleaned = value.trim();
  if (!/^\d{8}$/.test(cleaned)) return "";
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)} 12:00:00.000Z`;
}

function normalizeOptionalClinicalZeros(record) {
  const zeroFields = [
    "av_sc_od", "av_sc_oi", "av_cc_od", "av_cc_oi",
    "ref_lejos_od_esf", "ref_lejos_od_cil", "ref_lejos_od_eje",
    "ref_lejos_oi_esf", "ref_lejos_oi_cil", "ref_lejos_oi_eje",
    "ref_cerca_od_esf", "ref_cerca_od_cil", "ref_cerca_od_eje",
    "ref_cerca_oi_esf", "ref_cerca_oi_cil", "ref_cerca_oi_eje",
    "pio_od", "pio_oi",
  ];
  const normalized = { ...record };

  for (const field of zeroFields) {
    const value = String(normalized[field] ?? "").trim().replace(",", ".").replace(/\s+/g, "");
    if (/^[+-]?0+(?:\.0+)?$/.test(value)) normalized[field] = "";
  }

  return normalized;
}

async function listAll(collection, options = {}) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PB_PER_PAGE),
    });
    if (options.filter) params.set("filter", options.filter);
    if (options.sort) params.set("sort", options.sort);
    if (options.fields) params.set("fields", options.fields);

    try {
      const data = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
      items.push(...(data.items || []));
      totalPages = data.totalPages || 1;
      page += 1;
    } catch (error) {
      if (options.allowMissingCollection && error instanceof Error && error.message.startsWith("PocketBase 404:")) {
        return [];
      }
      throw error;
    }
  } while (page <= totalPages);

  return items;
}

async function deleteRecord(collection, id) {
  await pb(`/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function pb(apiPath, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${PB_URL}${apiPath}`, { ...options, headers });
  const text = await response.text();
  if (!response.ok) throw new Error(`PocketBase ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function adminToken() {
  if (env.POCKETBASE_ADMIN_TOKEN) return env.POCKETBASE_ADMIN_TOKEN;
  if (!env.POCKETBASE_ADMIN_EMAIL || !env.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura credenciales admin en ${ENV_PATH}`);
  }

  const body = JSON.stringify({
    identity: env.POCKETBASE_ADMIN_EMAIL,
    password: env.POCKETBASE_ADMIN_PASSWORD,
  });
  let response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    response = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  }

  if (!response.ok) throw new Error(`No se pudo autenticar contra PocketBase: ${response.status} ${await response.text()}`);
  return (await response.json()).token;
}

function readFichaList(filePath) {
  const values = fs.readFileSync(filePath, "utf8")
    .split(/\D+/)
    .map(normalizeFicha)
    .filter(Boolean);
  return [...new Set(values)];
}

function normalizeFicha(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const numeric = Number(trimmed.replace(",", "."));
  if (Number.isFinite(numeric)) return String(Math.trunc(numeric));
  return trimmed.toUpperCase();
}

function normalizeUserRoles(user) {
  const roles = [];
  const add = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized) roles.push(normalized);
  };
  add(user.role);
  if (Array.isArray(user.roles)) user.roles.forEach(add);
  return [...new Set(roles)];
}

function isLegacyConsulta(consulta) {
  return String(consulta.motivo_consulta || "").toLowerCase().includes("legacy");
}

function summaryOperation(operation) {
  return {
    ficha: operation.ficha,
    datomedRows: operation.datomedRows,
    existingConsultas: operation.existingConsultas,
    legacyConsultas: operation.legacyConsultas,
    patient: summaryPatient(operation.patient),
  };
}

function summaryPatient(patient) {
  return {
    id: patient.id,
    patient: [patient.apellido, patient.nombre].filter(Boolean).join(", ") || patient.email || patient.id,
    document: patient.numero_documento || patient.dni || "",
    numero_ficha: patient.numero_ficha || "",
  };
}

function summaryConsulta(consulta) {
  return {
    id: consulta.id,
    fecha: consulta.fecha || "",
    motivo_consulta: consulta.motivo_consulta || "",
    diagnostico: consulta.diagnostico || "",
  };
}

function groupBy(items, keyFn) {
  const result = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const list = result.get(key) || [];
    list.push(item);
    result.set(key, list);
  }
  return result;
}

function escapeFilterValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function requiredEnv(name, fallback = "") {
  const value = env[name] || process.env[name] || fallback;
  if (!value) throw new Error(`${name} es requerido`);
  return value;
}
