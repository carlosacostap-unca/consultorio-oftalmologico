import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const ENV_PATH = argValue("--env") || ".env.local";
const PB_PER_PAGE = 500;
const APPLY_CONCURRENCY = 6;
const CREATE_CONCURRENCY = 4;
const DELETE_CONCURRENCY = 8;
const env = loadEnv(ENV_PATH);
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const token = await adminToken();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

fs.mkdirSync("reports", { recursive: true });

const datomedRowsByFicha = readDatomedRowsByFicha(path.join("data", "DATOMED.DBF"));
const legacyConsultas = await listAll("consultas", {
  filter: 'motivo_consulta ~ "Legacy" || motivo_consulta ~ "legacy"',
  fields: "id,paciente_id,numero_ficha,fecha,motivo_consulta,diagnostico,tratamiento,estado,medico_id",
  sort: "paciente_id,fecha",
});

const consultasByPatient = new Map();
for (const consulta of legacyConsultas) {
  if (!consulta.paciente_id) continue;
  const consultas = consultasByPatient.get(consulta.paciente_id) || [];
  consultas.push(consulta);
  consultasByPatient.set(consulta.paciente_id, consultas);
}

const patientIds = [...consultasByPatient.keys()];
const patients = await fetchPatientsByIds(patientIds);
const patientById = new Map(patients.map((patient) => [patient.id, patient]));
const operations = [];
const blockers = [];

for (const [patientId, consultas] of consultasByPatient) {
  const patient = patientById.get(patientId);
  if (!patient) {
    blockers.push({
      patientId,
      reason: "Paciente no encontrado",
      legacyConsultas: consultas.length,
    });
    continue;
  }

  const ficha = normalizeFicha(patient.numero_ficha || consultas[0]?.numero_ficha);
  if (!ficha) {
    blockers.push({
      patientId,
      patient: patientLabel(patient),
      reason: "Paciente sin numero de ficha",
      legacyConsultas: consultas.length,
    });
    continue;
  }

  const datomedRows = datomedRowsByFicha.get(ficha) || [];
  if (datomedRows.length === 0) {
    blockers.push({
      patientId,
      patient: patientLabel(patient),
      ficha,
      reason: "DATOMED.DBF no tiene consultas para la ficha",
      legacyConsultas: consultas.length,
    });
    continue;
  }

  operations.push({
    action: "queda",
    sourceFicha: ficha,
    targetFicha: ficha,
    datomedRows: datomedRows.length,
    legacyConsultas: consultas.length,
    patient,
  });
}

const dryRunSummary = {
  createdAt: new Date().toISOString(),
  mode: APPLY ? "apply" : "dry-run",
  pocketBaseUrl: PB_URL,
  legacyConsultas: legacyConsultas.length,
  legacyPatients: consultasByPatient.size,
  operations: operations.length,
  blockers: blockers.length,
  consultasToImport: operations.reduce((sum, operation) => sum + operation.datomedRows, 0),
  medicoId: "",
  medicoPolicy: "sin medico asignado",
  sampleOperations: operations.slice(0, 20).map(summaryOperation),
  sampleBlockers: blockers.slice(0, 50),
};

const reportPath = path.join("reports", `legacy-queda-masivo-${timestamp}.json`);
fs.writeFileSync(reportPath, JSON.stringify({ ...dryRunSummary, blockers }, null, 2), "utf8");

console.log(`Modo: ${APPLY ? "APPLY" : "DRY-RUN"}`);
console.log(`Consultas con Legacy: ${dryRunSummary.legacyConsultas}`);
console.log(`Pacientes con Legacy: ${dryRunSummary.legacyPatients}`);
console.log(`Operaciones Queda posibles: ${dryRunSummary.operations}`);
console.log(`Bloqueos: ${dryRunSummary.blockers}`);
console.log(`Consultas a importar desde DATOMED.DBF: ${dryRunSummary.consultasToImport}`);
console.log("Medico asignado para importacion: Sin medico asignado");
console.log(`Reporte: ${reportPath}`);

if (!APPLY) {
  console.log("Dry-run finalizado. Reejecuta con --apply para modificar datos.");
  process.exit();
}

const backup = await buildBackup(operations);
const backupDir = path.join("data", "backups", "legacy-queda-masivo");
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `${timestamp}-backup.json`);
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
console.log(`Backup global: ${backupPath}`);

const results = [];
let appliedCount = 0;
results.push(...await mapWithConcurrency(operations, APPLY_CONCURRENCY, async (operation) => {
  const result = await applyOperation(operation, backup.byPatient[operation.patient.id]);
  appliedCount += 1;
  if (appliedCount % 100 === 0 || appliedCount === operations.length) {
    console.log(`[${appliedCount}/${operations.length}] pacientes procesados`);
  }
  return result;
}));

const resultPath = path.join("reports", `legacy-queda-masivo-${timestamp}-resultado.json`);
fs.writeFileSync(resultPath, JSON.stringify({ ...dryRunSummary, backupPath, results, blockers }, null, 2), "utf8");
console.log(`Resultado: ${resultPath}`);
console.log("Proceso masivo finalizado.");

async function applyOperation(operation, backupEntry) {
  const datomedRows = datomedRowsByFicha.get(operation.sourceFicha) || [];
  const created = [];

  const createdConsultas = await mapWithConcurrency(datomedRows, CREATE_CONCURRENCY, (row) => (
    pb("/api/collections/consultas/records", {
      method: "POST",
      body: JSON.stringify(normalizeOptionalClinicalZeros({
        ...row.payload,
        paciente_id: operation.patient.id,
        numero_ficha: operation.targetFicha,
      })),
    })
  ));
  created.push(...createdConsultas.map((consulta) => consulta.id));

  await mapWithConcurrency(backupEntry.consultaEventos, DELETE_CONCURRENCY, (event) => deleteRecord("consulta_eventos", event.id));
  await mapWithConcurrency(backupEntry.consultas, DELETE_CONCURRENCY, (consulta) => deleteRecord("consultas", consulta.id));

  return {
    action: "queda",
    patientId: operation.patient.id,
    patient: patientLabel(operation.patient),
    ficha: operation.targetFicha,
    deletedConsultas: backupEntry.consultas.length,
    deletedConsultaEventos: backupEntry.consultaEventos.length,
    importedConsultas: created.length,
    createdConsultaIds: created,
  };
}

async function buildBackup(plannedOperations) {
  const byPatient = Object.fromEntries(plannedOperations.map((operation) => [
    operation.patient.id,
    {
      operation: summaryOperation(operation),
      patient: operation.patient,
      consultas: [],
      consultaEventos: [],
    },
  ]));
  const patientIds = plannedOperations.map((operation) => operation.patient.id);
  const consultas = [];

  console.log(`Preparando backup de consultas para ${patientIds.length} pacientes...`);
  let patientChunksDone = 0;
  for (const chunk of chunks(patientIds, 60)) {
    const filter = chunk.map((id) => `paciente_id = "${escapeFilterValue(id)}"`).join(" || ");
    consultas.push(...await listAll("consultas", {
      filter,
      fields: "id,paciente_id,numero_ficha,fecha,motivo_consulta,diagnostico,tratamiento,estado,medico_id",
    }));
    patientChunksDone += 1;
    if (patientChunksDone % 25 === 0) console.log(`Backup consultas: ${patientChunksDone} lotes leidos`);
  }

  for (const consulta of consultas) {
    const entry = byPatient[consulta.paciente_id];
    if (entry) entry.consultas.push(consulta);
  }

  const consultaEventos = [];
  console.log(`Preparando backup de eventos para ${consultas.length} consultas...`);
  let eventChunksDone = 0;
  for (const chunk of chunks(consultas.map((consulta) => consulta.id), 35)) {
    if (chunk.length === 0) continue;
    const filter = chunk.map((id) => `consulta_id = "${escapeFilterValue(id)}"`).join(" || ");
    consultaEventos.push(...await listAll("consulta_eventos", {
      filter,
      fields: "id,consulta_id,paciente_id,tipo,titulo,detalle,metadata,actor_id,actor_nombre,created,updated",
      allowMissingCollection: true,
    }));
    eventChunksDone += 1;
    if (eventChunksDone % 50 === 0) console.log(`Backup eventos: ${eventChunksDone} lotes leidos`);
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

async function fetchPatientsByIds(ids) {
  const patients = [];
  for (const chunk of chunks(ids, 60)) {
    const filter = chunk.map((id) => `id = "${escapeFilterValue(id)}"`).join(" || ");
    patients.push(...await listAll("pacientes", {
      filter,
      fields: "id,nombre,apellido,tipo_documento,numero_documento,dni,telefono,email,obra_social,numero_ficha,estado_registro",
    }));
  }
  return patients;
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

function normalizeFicha(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const numeric = Number(trimmed.replace(",", "."));
  if (Number.isFinite(numeric)) return String(Math.trunc(numeric));
  return trimmed.toUpperCase();
}

function summaryOperation(operation) {
  return {
    action: "queda",
    ficha: operation.sourceFicha,
    datomedRows: operation.datomedRows,
    legacyConsultas: operation.legacyConsultas,
    patientId: operation.patient.id,
    patient: patientLabel(operation.patient),
    document: patientDocument(operation.patient),
  };
}

function patientLabel(patient) {
  return [patient.apellido, patient.nombre].filter(Boolean).join(", ") || patient.email || patient.id;
}

function patientDocument(patient) {
  return patient.numero_documento || patient.dni || "";
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
