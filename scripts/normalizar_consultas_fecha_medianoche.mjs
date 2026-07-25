import fs from "node:fs";
import path from "node:path";
import { envFileFromArgs, hasFlag, loadEnvFile, pocketBaseUrl } from "./env_utils.mjs";

const PB_PER_PAGE = 500;
const APPLY_CONFIRMATION = "CONFIRMO_NORMALIZAR_FECHAS_CONSULTAS";

const envFile = envFileFromArgs(".env.local");
const env = { ...process.env, ...loadEnvFile(envFile) };
const PB_URL = pocketBaseUrl(env);
const apply = hasFlag("--apply");
const confirmation = argValue("--confirm");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

if (!PB_URL) {
  throw new Error("POCKETBASE_URL o NEXT_PUBLIC_POCKETBASE_URL es requerido.");
}

if (apply && confirmation !== APPLY_CONFIRMATION) {
  throw new Error(`Para aplicar cambios ejecuta con --confirm=${APPLY_CONFIRMATION}`);
}

const token = await adminToken();
const candidates = await listCandidates();
const updates = candidates.map((consulta) => ({
  id: consulta.id,
  previousFecha: consulta.fecha,
  nextFecha: normalizeMidnightToNoonUtc(consulta.fecha),
  paciente_id: consulta.paciente_id || "",
  numero_ficha: consulta.numero_ficha || "",
  motivo_consulta: consulta.motivo_consulta || "",
  created: consulta.created || "",
}));

const dryRunReport = {
  mode: apply ? "apply" : "dry-run",
  generatedAt: new Date().toISOString(),
  pocketBaseUrl: PB_URL,
  totalCandidates: candidates.length,
  samples: updates.slice(0, 12),
};

fs.mkdirSync("reports", { recursive: true });

if (!apply) {
  const reportPath = path.join("reports", `normalizar-consultas-fecha-medianoche-${timestamp}-dry-run.json`);
  fs.writeFileSync(reportPath, JSON.stringify(dryRunReport, null, 2));

  console.log(`Dry-run finalizado.`);
  console.log(`Consultas candidatas: ${candidates.length}`);
  console.log(`Reporte: ${reportPath}`);
  console.log(`Para aplicar: node scripts/normalizar_consultas_fecha_medianoche.mjs --apply --confirm=${APPLY_CONFIRMATION}`);
} else {
  await applyNormalization(dryRunReport);
}

async function listCandidates() {
  const candidates = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await getConsultasPage(page);
    totalPages = data.totalPages || 1;
    for (const consulta of data.items || []) {
      if (isExactMidnightUtc(consulta.fecha)) {
        candidates.push(consulta);
      }
    }
    page += 1;
  } while (page <= totalPages);

  return candidates;
}

async function countCandidates() {
  return (await listCandidates()).length;
}

async function applyNormalization(baseReport) {
  const backupDir = path.join("data", "backups", "normalizar-consultas-fecha-medianoche");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${timestamp}-backup.json`);
  fs.writeFileSync(backupPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    pocketBaseUrl: PB_URL,
    total: candidates.length,
    consultas: candidates,
  }, null, 2));

  const result = {
    ...baseReport,
    backupPath,
    updated: [],
    failed: [],
    remainingMidnightUtc: null,
  };

  for (const update of updates) {
    try {
      await pb(`/api/collections/consultas/records/${encodeURIComponent(update.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ fecha: update.nextFecha }),
      });
      result.updated.push(update);
    } catch (error) {
      result.failed.push({
        ...update,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  result.remainingMidnightUtc = await countCandidates();

  const resultPath = path.join("reports", `normalizar-consultas-fecha-medianoche-${timestamp}-resultado.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

  console.log(`Aplicacion finalizada.`);
  console.log(`Candidatas: ${candidates.length}`);
  console.log(`Actualizadas: ${result.updated.length}`);
  console.log(`Errores: ${result.failed.length}`);
  console.log(`Restantes a medianoche UTC: ${result.remainingMidnightUtc}`);
  console.log(`Backup: ${backupPath}`);
  console.log(`Reporte: ${resultPath}`);

  if (result.failed.length > 0 || result.remainingMidnightUtc > 0) {
    process.exitCode = 1;
  }
}

async function getConsultasPage(page) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(PB_PER_PAGE),
    sort: "fecha,created",
    filter: 'fecha ~ " 00:00:00"',
    fields: "id,fecha,created,paciente_id,numero_ficha,motivo_consulta",
  });

  return pb(`/api/collections/consultas/records?${params}`);
}

function isExactMidnightUtc(value) {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2} 00:00:00\.000Z$/.test(value);
}

function normalizeMidnightToNoonUtc(value) {
  if (!isExactMidnightUtc(value)) {
    throw new Error(`Fecha no normalizable: ${value}`);
  }

  return value.replace(" 00:00:00.000Z", " 12:00:00.000Z");
}

async function pb(apiPath, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${PB_URL}${apiPath}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`PocketBase ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function adminToken() {
  if (env.POCKETBASE_ADMIN_TOKEN) return env.POCKETBASE_ADMIN_TOKEN;

  const body = JSON.stringify({
    identity: env.POCKETBASE_ADMIN_EMAIL,
    password: env.POCKETBASE_ADMIN_PASSWORD,
  });

  for (const authPath of ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]) {
    const response = await fetch(`${PB_URL}${authPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
  }

  throw new Error(`No se pudo autenticar en PocketBase usando ${envFile}.`);
}

function argValue(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = process.argv.indexOf(name);
  return index !== -1 ? process.argv[index + 1] || "" : "";
}
