import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const ENV_PATH = argValue("--env") || ".env.local";
const PER_PAGE = 500;

const OLD_MEDICO_ID = "jf5tybec5jcfvcd";
const MEDICO_2010_OR_BEFORE = "odzko7f680yyzrv";
const MEDICO_2011_OR_AFTER = "wv05xstcffuufe7";
const MEDICO_WITHOUT_DATE = MEDICO_2010_OR_BEFORE;

const env = loadEnv(ENV_PATH);
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const token = await adminToken();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

fs.mkdirSync("reports", { recursive: true });

const [oldDoctor, beforeDoctor, afterDoctor] = await Promise.all([
  getRecord("users", OLD_MEDICO_ID),
  getRecord("users", MEDICO_2010_OR_BEFORE),
  getRecord("users", MEDICO_2011_OR_AFTER),
]);

const consultas = await listAll("consultas", {
  filter: `medico_id = "${escapeFilterValue(OLD_MEDICO_ID)}"`,
  sort: "fecha,created",
  fields: "id,paciente_id,numero_ficha,fecha,created,updated,medico_id,motivo_consulta,diagnostico",
});

const blockers = [];
const updates = consultas.map((consulta) => {
  const year = consultationYear(consulta);

  return {
    id: consulta.id,
    fecha: consulta.fecha || "",
    year,
    from: OLD_MEDICO_ID,
    to: !year ? MEDICO_WITHOUT_DATE : year <= 2010 ? MEDICO_2010_OR_BEFORE : MEDICO_2011_OR_AFTER,
    paciente_id: consulta.paciente_id || "",
    numero_ficha: consulta.numero_ficha || "",
  };
});

const summary = {
  createdAt: new Date().toISOString(),
  mode: APPLY ? "apply" : "dry-run",
  pocketBaseUrl: PB_URL,
  sourceDoctor: doctorSummary(oldDoctor),
  targetDoctor2010OrBefore: doctorSummary(beforeDoctor),
  targetDoctor2011OrAfter: doctorSummary(afterDoctor),
  totalConsultas: consultas.length,
  to2010OrBefore: updates.filter((update) => update.to === MEDICO_2010_OR_BEFORE).length,
  to2011OrAfter: updates.filter((update) => update.to === MEDICO_2011_OR_AFTER).length,
  withoutDate: updates.filter((update) => !update.year).length,
  withoutDateAssignedTo: MEDICO_WITHOUT_DATE,
  blockers,
  sample: updates.slice(0, 30),
};

const reportPath = path.join("reports", `reasignar-consultas-medico-${timestamp}.json`);
fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), "utf8");

console.log(`Modo: ${APPLY ? "APPLY" : "DRY-RUN"}`);
console.log(`Consultas con medico ${OLD_MEDICO_ID}: ${summary.totalConsultas}`);
console.log(`A ${MEDICO_2010_OR_BEFORE} (2010 o previa): ${summary.to2010OrBefore}`);
console.log(`A ${MEDICO_2011_OR_AFTER} (2011 o posterior): ${summary.to2011OrAfter}`);
console.log(`Sin fecha asignadas a ${MEDICO_WITHOUT_DATE}: ${summary.withoutDate}`);
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

fs.mkdirSync(path.join("data", "backups", "reasignar-consultas-medico"), { recursive: true });
const backupPath = path.join("data", "backups", "reasignar-consultas-medico", `${timestamp}-backup.json`);
fs.writeFileSync(backupPath, JSON.stringify({
  createdAt: new Date().toISOString(),
  pocketBaseUrl: PB_URL,
  oldMedicoId: OLD_MEDICO_ID,
  medico2010OrBefore: MEDICO_2010_OR_BEFORE,
  medico2011OrAfter: MEDICO_2011_OR_AFTER,
  consultas,
  updates,
}, null, 2), "utf8");
console.log(`Backup: ${backupPath}`);

let updated = 0;
for (const update of updates) {
  await pb(`/api/collections/consultas/records/${encodeURIComponent(update.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ medico_id: update.to }),
  });
  updated += 1;

  if (updated % 100 === 0 || updated === updates.length) {
    console.log(`Actualizadas ${updated}/${updates.length}`);
  }
}

const remaining = await listAll("consultas", {
  filter: `medico_id = "${escapeFilterValue(OLD_MEDICO_ID)}"`,
  fields: "id,fecha,medico_id",
});

const resultPath = path.join("reports", `reasignar-consultas-medico-${timestamp}-resultado.json`);
fs.writeFileSync(resultPath, JSON.stringify({
  ...summary,
  backupPath,
  updated,
  remainingOldDoctor: remaining.length,
  remaining,
}, null, 2), "utf8");

console.log(`Actualizadas: ${updated}`);
console.log(`Consultas restantes con ${OLD_MEDICO_ID}: ${remaining.length}`);
console.log(`Resultado: ${resultPath}`);

if (remaining.length > 0) {
  process.exitCode = 1;
}

function consultationYear(consulta) {
  const raw = String(consulta.fecha || "").trim();
  const match = raw.match(/^(\d{4})/);
  if (match) {
    const year = Number(match[1]);
    return Number.isFinite(year) ? year : 0;
  }

  const parsed = new Date(raw);
  const year = parsed.getUTCFullYear();
  return Number.isFinite(year) && year > 1900 ? year : 0;
}

function doctorSummary(user) {
  return {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
  };
}

async function getRecord(collection, id) {
  return pb(`/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}`);
}

async function listAll(collection, options = {}) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE),
    });
    if (options.filter) params.set("filter", options.filter);
    if (options.sort) params.set("sort", options.sort);
    if (options.fields) params.set("fields", options.fields);

    const data = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
    items.push(...(data.items || []));
    totalPages = data.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return items;
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
