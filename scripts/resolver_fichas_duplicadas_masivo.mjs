import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const ENV_PATH = argValue("--env") || ".env.local";
const PB_PER_PAGE = 500;
const MAX_FICHA_ATTEMPTS = 100000;
const env = loadEnv(ENV_PATH);
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const token = await adminToken();

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportDir = path.join("reports");
fs.mkdirSync(reportDir, { recursive: true });

const datomedRowsByFicha = readDatomedRowsByFicha(path.join("data", "DATOMED.DBF"));
const patients = await listAll("pacientes", {
  sort: "numero_ficha,apellido,nombre",
  fields: "id,nombre,apellido,tipo_documento,numero_documento,dni,telefono,email,obra_social,numero_ficha,estado_registro",
  filter: activePatientFilter(),
});
const medicoId = "";

const duplicateGroups = duplicateFichaGroups(patients);
const occupiedFichas = new Set(patients.map((patient) => normalizeFicha(patient.numero_ficha)).filter(Boolean));
let nextFichaNumber = Math.max(0, ...[...occupiedFichas].map((ficha) => numericFichaValue(ficha))) + 1;

const operations = [];
const blockers = [];

for (const group of duplicateGroups) {
  const datomedRows = datomedRowsByFicha.get(group.ficha) || [];
  if (datomedRows.length === 0) {
    blockers.push(`Ficha ${group.ficha}: DATOMED.DBF no tiene consultas.`);
    continue;
  }

  group.patients.forEach((patient, index) => {
    const action = index === 0 ? "queda" : "separar";
    let targetFicha = group.ficha;

    if (action === "separar") {
      targetFicha = takeNextAvailableFicha(occupiedFichas);
    }

    operations.push({
      action,
      sourceFicha: group.ficha,
      targetFicha,
      datomedRows: datomedRows.length,
      patient,
    });
  });
}

const dryRunSummary = {
  createdAt: new Date().toISOString(),
  mode: APPLY ? "apply" : "dry-run",
  pocketBaseUrl: PB_URL,
  duplicateFichas: duplicateGroups.length,
  duplicatePatients: duplicateGroups.reduce((sum, group) => sum + group.patients.length, 0),
  operations: operations.length,
  queda: operations.filter((operation) => operation.action === "queda").length,
  separar: operations.filter((operation) => operation.action === "separar").length,
  importedConsultas: operations.reduce((sum, operation) => sum + operation.datomedRows, 0),
  medicoId,
  medicoPolicy: "sin medico asignado",
  blockers,
  sample: operations.slice(0, 20).map(summaryOperation),
};

const reportPath = path.join(reportDir, `resolver-fichas-duplicadas-${timestamp}.json`);
fs.writeFileSync(reportPath, JSON.stringify(dryRunSummary, null, 2), "utf8");

console.log(`Modo: ${APPLY ? "APPLY" : "DRY-RUN"}`);
console.log(`Fichas duplicadas: ${dryRunSummary.duplicateFichas}`);
console.log(`Pacientes en fichas duplicadas: ${dryRunSummary.duplicatePatients}`);
console.log(`Operaciones: ${dryRunSummary.operations} (${dryRunSummary.queda} Queda, ${dryRunSummary.separar} Separar)`);
console.log(`Consultas a importar desde DATOMED.DBF: ${dryRunSummary.importedConsultas}`);
console.log("Medico asignado: Sin medico asignado");
console.log(`Reporte: ${reportPath}`);

if (blockers.length > 0) {
  console.log("Bloqueos:");
  for (const blocker of blockers.slice(0, 20)) console.log(`- ${blocker}`);
  if (blockers.length > 20) console.log(`- ... ${blockers.length - 20} bloqueos mas`);
  process.exitCode = 1;
  process.exit();
}

if (!APPLY) {
  console.log("Dry-run finalizado. Reejecuta con --apply para modificar datos.");
  process.exit();
}

const backup = await buildBackup(operations);
const backupDir = path.join("data", "backups", "fichas-duplicadas-masivo");
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `${timestamp}-backup.json`);
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
console.log(`Backup global: ${backupPath}`);

const results = [];
for (const [index, operation] of operations.entries()) {
  console.log(`[${index + 1}/${operations.length}] ${operation.action.toUpperCase()} ${patientLabel(operation.patient)} ficha ${operation.sourceFicha} -> ${operation.targetFicha}`);
  results.push(await applyOperation(operation, backup.byPatient[operation.patient.id]));
}

const resultPath = path.join(reportDir, `resolver-fichas-duplicadas-${timestamp}-resultado.json`);
fs.writeFileSync(resultPath, JSON.stringify({ ...dryRunSummary, backupPath, results }, null, 2), "utf8");
console.log(`Resultado: ${resultPath}`);
console.log("Proceso masivo finalizado.");

async function applyOperation(operation, backupEntry) {
  const datomedRows = datomedRowsByFicha.get(operation.sourceFicha) || [];
  const created = [];

  for (const row of datomedRows) {
    const createdConsulta = await pb("/api/collections/consultas/records", {
      method: "POST",
      body: JSON.stringify(normalizeOptionalClinicalZeros({
        ...row.payload,
        paciente_id: operation.patient.id,
        numero_ficha: operation.targetFicha,
      })),
    });
    created.push(createdConsulta.id);
  }

  if (operation.action === "separar") {
    await pb(`/api/collections/pacientes/records/${encodeURIComponent(operation.patient.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ numero_ficha: operation.targetFicha }),
    });
  }

  for (const event of backupEntry.consultaEventos) {
    await deleteRecord("consulta_eventos", event.id);
  }
  for (const consulta of backupEntry.consultas) {
    await deleteRecord("consultas", consulta.id);
  }

  return {
    action: operation.action,
    patientId: operation.patient.id,
    patient: patientLabel(operation.patient),
    sourceFicha: operation.sourceFicha,
    targetFicha: operation.targetFicha,
    deletedConsultas: backupEntry.consultas.length,
    deletedConsultaEventos: backupEntry.consultaEventos.length,
    importedConsultas: created.length,
    createdConsultaIds: created,
  };
}

async function buildBackup(plannedOperations) {
  const byPatient = {};

  for (const operation of plannedOperations) {
    const consultas = await listAll("consultas", {
      filter: `paciente_id = "${escapeFilterValue(operation.patient.id)}"`,
      fields: "id,paciente_id,numero_ficha,fecha,motivo_consulta,diagnostico,tratamiento,estado,medico_id",
    });
    const consultaIds = consultas.map((consulta) => consulta.id);
    const consultaEventos = [];

    for (const chunk of chunks(consultaIds, 35)) {
      if (chunk.length === 0) continue;
      const filter = chunk.map((id) => `consulta_id = "${escapeFilterValue(id)}"`).join(" || ");
      consultaEventos.push(...await listAll("consulta_eventos", {
        filter,
        fields: "id,consulta_id,paciente_id,tipo,titulo,detalle,metadata,actor_id,actor_nombre,created,updated",
        allowMissingCollection: true,
      }));
    }

    byPatient[operation.patient.id] = {
      operation: summaryOperation(operation),
      patient: operation.patient,
      consultas,
      consultaEventos,
    };
  }

  return {
    createdAt: new Date().toISOString(),
    pocketBaseUrl: PB_URL,
    operations: plannedOperations.map(summaryOperation),
    byPatient,
  };
}

function duplicateFichaGroups(records) {
  const groups = new Map();

  for (const patient of records) {
    const ficha = normalizeFicha(patient.numero_ficha);
    if (!ficha) continue;

    const list = groups.get(ficha) || [];
    list.push(patient);
    groups.set(ficha, list);
  }

  return [...groups.entries()]
    .filter(([, groupPatients]) => groupPatients.length > 1)
    .map(([ficha, groupPatients]) => ({
      ficha,
      patients: groupPatients.sort((a, b) => patientLabel(a).localeCompare(patientLabel(b), "es-AR")),
    }))
    .sort((a, b) => a.ficha.localeCompare(b.ficha, "es-AR", { numeric: true }));
}

function takeNextAvailableFicha(occupied) {
  for (let attempt = 0; attempt < MAX_FICHA_ATTEMPTS; attempt += 1) {
    const ficha = String(nextFichaNumber);
    nextFichaNumber += 1;
    if (occupied.has(ficha)) continue;
    occupied.add(ficha);
    return ficha;
  }

  throw new Error(`No se pudo reservar una ficha nueva despues de ${MAX_FICHA_ATTEMPTS} intentos.`);
}

function summaryOperation(operation) {
  return {
    action: operation.action,
    fichaOrigen: operation.sourceFicha,
    fichaDestino: operation.targetFicha,
    datomedRows: operation.datomedRows,
    patientId: operation.patient.id,
    patient: patientLabel(operation.patient),
    document: patientDocument(operation.patient),
  };
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

function activePatientFilter() {
  return 'estado_registro = "" || estado_registro = null';
}

function normalizeFicha(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const numeric = Number(trimmed.replace(",", "."));
  if (Number.isFinite(numeric)) return String(Math.trunc(numeric));
  return trimmed.toUpperCase();
}

function numericFichaValue(value) {
  const matches = String(value || "").match(/\d+/g);
  if (!matches?.length) return 0;
  const parsed = Number(matches[matches.length - 1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeUserRoles(user) {
  const roles = Array.isArray(user.roles) ? user.roles : typeof user.roles === "string" ? [user.roles] : [];
  if (roles.length > 0) return roles.filter((role) => ["admin", "medico", "secretaria"].includes(role));
  return ["admin", "medico", "secretaria"].includes(user.role) ? [user.role] : [];
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
