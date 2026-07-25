import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const ENV_PATH = argValue("--env") || ".env.local";
const PB_PER_PAGE = 500;
const DELETE_CONCURRENCY = 8;
const env = loadEnv(ENV_PATH);
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const token = await adminToken();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

fs.mkdirSync("reports", { recursive: true });

const legacyConsultas = await listAll("consultas", {
  filter: 'motivo_consulta ~ "Legacy" || motivo_consulta ~ "legacy"',
  fields: "id,paciente_id,numero_ficha,fecha,motivo_consulta,diagnostico,tratamiento,estado,medico_id,created,updated",
  sort: "numero_ficha,fecha",
});
const consultaIds = legacyConsultas.map((consulta) => consulta.id);
const legacyPatientIds = new Set(legacyConsultas.map((consulta) => consulta.paciente_id).filter(Boolean));
const orphanConsultas = legacyConsultas.filter((consulta) => !consulta.paciente_id);
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

const summary = {
  createdAt: new Date().toISOString(),
  mode: APPLY ? "apply" : "dry-run",
  pocketBaseUrl: PB_URL,
  legacyConsultas: legacyConsultas.length,
  legacyPatients: legacyPatientIds.size,
  orphanConsultas: orphanConsultas.length,
  consultaEventos: consultaEventos.length,
};

const reportPath = path.join("reports", `eliminar-consultas-legacy-${timestamp}.json`);
fs.writeFileSync(reportPath, JSON.stringify({
  ...summary,
  sampleConsultas: legacyConsultas.slice(0, 20),
  sampleEventos: consultaEventos.slice(0, 20),
}, null, 2), "utf8");

console.log(`Modo: ${APPLY ? "APPLY" : "DRY-RUN"}`);
console.log(`Consultas Legacy: ${summary.legacyConsultas}`);
console.log(`Pacientes relacionados: ${summary.legacyPatients}`);
console.log(`Consultas huerfanas: ${summary.orphanConsultas}`);
console.log(`Eventos relacionados: ${summary.consultaEventos}`);
console.log(`Reporte: ${reportPath}`);

if (!APPLY) {
  console.log("Dry-run finalizado. Reejecuta con --apply para eliminar las consultas Legacy.");
  process.exit();
}

const backupDir = path.join("data", "backups", "eliminar-consultas-legacy");
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `${timestamp}-backup.json`);
fs.writeFileSync(backupPath, JSON.stringify({
  ...summary,
  consultas: legacyConsultas,
  consultaEventos,
}, null, 2), "utf8");
console.log(`Backup global: ${backupPath}`);

await mapWithConcurrency(consultaEventos, DELETE_CONCURRENCY, (event) => deleteRecord("consulta_eventos", event.id));
await mapWithConcurrency(legacyConsultas, DELETE_CONCURRENCY, (consulta) => deleteRecord("consultas", consulta.id));

const remaining = await listAll("consultas", {
  filter: 'motivo_consulta ~ "Legacy" || motivo_consulta ~ "legacy"',
  fields: "id",
});
const resultPath = path.join("reports", `eliminar-consultas-legacy-${timestamp}-resultado.json`);
fs.writeFileSync(resultPath, JSON.stringify({
  ...summary,
  backupPath,
  deletedConsultas: legacyConsultas.length,
  deletedConsultaEventos: consultaEventos.length,
  remainingLegacyConsultas: remaining.length,
}, null, 2), "utf8");

console.log(`Consultas Legacy restantes: ${remaining.length}`);
console.log(`Resultado: ${resultPath}`);
console.log("Proceso finalizado.");

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
