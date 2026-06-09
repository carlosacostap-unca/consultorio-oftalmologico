import fs from "node:fs";
import iconv from "iconv-lite";
import {
  envFileFromArgs,
  hasFlag,
  loadEnvFile,
  pocketBaseUrl,
} from "./env_utils.mjs";

const envFile = envFileFromArgs(".env.local");
const env = loadEnvFile(envFile, { required: true });
const PB_URL = pocketBaseUrl({ ...process.env, ...env });
const DBF_PATH = argValue("--source") || "PACIENTE.DBF";
const APPLY = hasFlag("--apply");
const PER_PAGE = Number(argValue("--per-page") || 500);
const CONCURRENCY = Number(argValue("--concurrency") || 20);

if (!PB_URL) {
  throw new Error("Configura POCKETBASE_URL o NEXT_PUBLIC_POCKETBASE_URL.");
}

const token = await adminToken(PB_URL, env, envFile);
const dbfOccupations = readPatientOccupationsFromDbf(DBF_PATH);

console.log("--- DBF PACIENTE ---");
console.log(`Registros: ${dbfOccupations.recordCount}`);
console.log(`Fichas con ocupacion: ${dbfOccupations.uniqueByFicha.size}`);
console.log(`Fichas con ocupacion conflictiva: ${dbfOccupations.conflicts.length}`);
if (dbfOccupations.conflicts.length > 0) {
  console.log("Primeras fichas conflictivas:");
  for (const conflict of dbfOccupations.conflicts.slice(0, 10)) {
    console.log(`- ${conflict.ficha}: ${conflict.ocupaciones.join(" | ")}`);
  }
}

const pacientes = await listAllPacientes();
const pacientesByFicha = groupBy(pacientes, (paciente) => normalizeFicha(paciente.numero_ficha));

const stats = {
  pacientesRevisados: pacientes.length,
  sourceFichasConOcupacion: dbfOccupations.uniqueByFicha.size,
  sourceFichasConflictivas: dbfOccupations.conflicts.length,
  sinFicha: 0,
  sinOcupacionEnDbf: 0,
  fichaAmbiguaEnPacientes: 0,
  sinCambios: 0,
  aActualizar: 0,
  actualizados: 0,
  errores: 0,
};

const updates = [];
for (const paciente of pacientes) {
  const ficha = normalizeFicha(paciente.numero_ficha);
  if (!ficha) {
    stats.sinFicha += 1;
    continue;
  }

  const patientMatches = pacientesByFicha.get(ficha) || [];
  if (patientMatches.length > 1) {
    stats.fichaAmbiguaEnPacientes += 1;
    continue;
  }

  const ocupacion = dbfOccupations.uniqueByFicha.get(ficha);
  if (!ocupacion) {
    stats.sinOcupacionEnDbf += 1;
    continue;
  }

  if (normalizeOccupation(paciente.ocupacion) === normalizeOccupation(ocupacion)) {
    stats.sinCambios += 1;
    continue;
  }

  stats.aActualizar += 1;
  updates.push({ id: paciente.id, ficha, ocupacion });
}

console.log("--- Cruce DBF -> PocketBase ---");
console.log(JSON.stringify(stats, null, 2));

if (!APPLY) {
  console.log("Modo diagnostico: no se aplicaron cambios. Reejecuta con --apply para actualizar pacientes.ocupacion.");
  process.exit(0);
}

const results = await runWithConcurrency(
  updates.map((update) => async () => {
    await pb(`/api/collections/pacientes/records/${encodeURIComponent(update.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ ocupacion: update.ocupacion }),
    });
  }),
  CONCURRENCY,
);

stats.actualizados = results.success;
stats.errores = results.failed;

console.log("--- Importacion aplicada ---");
console.log(JSON.stringify(stats, null, 2));

if (stats.errores > 0) {
  process.exitCode = 1;
}

function readPatientOccupationsFromDbf(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`No se encontro el DBF: ${path}`);
  }

  const buffer = fs.readFileSync(path);
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields = readDbfFields(buffer, headerLength);
  const fieldByName = new Map(fields.map((field) => [field.name, field]));
  const fichaField = requiredField(fieldByName, "NUM_FICH");
  const occupationField = requiredField(fieldByName, "OCUPAC");
  const occupationsByFicha = new Map();

  for (let index = 0; index < recordCount; index += 1) {
    const recordOffset = headerLength + index * recordLength;
    if (buffer[recordOffset] === 0x2a) continue;

    const ficha = normalizeFicha(readDbfField(buffer, recordOffset, fichaField));
    const ocupacion = normalizeOccupation(readDbfField(buffer, recordOffset, occupationField));
    if (!ficha || !ocupacion) continue;

    if (!occupationsByFicha.has(ficha)) occupationsByFicha.set(ficha, new Map());
    const values = occupationsByFicha.get(ficha);
    values.set(ocupacion, (values.get(ocupacion) || 0) + 1);
  }

  const uniqueByFicha = new Map();
  const conflicts = [];
  for (const [ficha, values] of occupationsByFicha) {
    if (values.size === 1) {
      uniqueByFicha.set(ficha, [...values.keys()][0]);
      continue;
    }

    conflicts.push({
      ficha,
      ocupaciones: [...values.entries()].map(([value, count]) => `${value} (${count})`),
    });
  }

  return { recordCount, uniqueByFicha, conflicts };
}

function readDbfFields(buffer, headerLength) {
  const fields = [];
  let offset = 32;
  let position = 1;

  while (offset < headerLength && buffer[offset] !== 0x0d) {
    const name = buffer.slice(offset, offset + 11).toString("ascii").replace(/\0.*$/, "").trim();
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    fields.push({ name, type, length, position });
    position += length;
    offset += 32;
  }

  return fields;
}

function readDbfField(buffer, recordOffset, field) {
  const start = recordOffset + field.position;
  const end = start + field.length;
  return iconv.decode(buffer.slice(start, end), "cp850");
}

function requiredField(fieldByName, name) {
  const field = fieldByName.get(name);
  if (!field) throw new Error(`El DBF no contiene el campo ${name}.`);
  return field;
}

function normalizeFicha(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) return String(Math.trunc(numeric));
  return trimmed.toUpperCase();
}

function normalizeOccupation(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function groupBy(items, getKey) {
  const result = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
  }
  return result;
}

async function listAllPacientes() {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE),
      sort: "numero_ficha",
      fields: "id,numero_ficha,ocupacion",
    });
    const result = await pb(`/api/collections/pacientes/records?${params}`);
    totalPages = result.totalPages;
    items.push(...result.items);
    console.log(`Pacientes cargados ${items.length}/${result.totalItems}`);
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function runWithConcurrency(tasks, concurrency) {
  let index = 0;
  const results = { success: 0, failed: 0 };

  async function worker() {
    while (index < tasks.length) {
      const taskIndex = index;
      index += 1;
      try {
        await tasks[taskIndex]();
        results.success += 1;
      } catch (error) {
        results.failed += 1;
        console.error(`Error en actualizacion ${taskIndex + 1}/${tasks.length}:`, error.message);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

async function adminToken(url, envValues, envPath) {
  if (envValues.POCKETBASE_ADMIN_TOKEN) return envValues.POCKETBASE_ADMIN_TOKEN;

  if (!envValues.POCKETBASE_ADMIN_EMAIL || !envValues.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura POCKETBASE_ADMIN_TOKEN o POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD en ${envPath}`);
  }

  const body = JSON.stringify({
    identity: envValues.POCKETBASE_ADMIN_EMAIL,
    password: envValues.POCKETBASE_ADMIN_PASSWORD,
  });

  for (const path of ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]) {
    const response = await fetch(`${url}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) {
      return (await response.json()).token;
    }
  }

  throw new Error(`No se pudo autenticar contra PocketBase usando ${envPath}`);
}

async function pb(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${PB_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(`PocketBase ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function argValue(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}
