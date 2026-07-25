import fs from "node:fs";
import path from "node:path";
import { envFileFromArgs, hasFlag, loadEnvFile, pocketBaseUrl } from "./env_utils.mjs";

const PB_PER_PAGE = 500;
const APPLY_CONFIRMATION = "CONFIRMO_NORMALIZAR_FECHAS_NACIMIENTO";

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
const updates = candidates.map((paciente) => ({
  id: paciente.id,
  previousFechaNacimiento: paciente.fecha_nacimiento,
  nextFechaNacimiento: normalizeMidnightToNoonUtc(paciente.fecha_nacimiento),
  apellido: paciente.apellido || "",
  nombre: paciente.nombre || "",
  numero_documento: paciente.numero_documento || paciente.dni || "",
  numero_ficha: paciente.numero_ficha || "",
  created: paciente.created || "",
}));

const baseReport = {
  mode: apply ? "apply" : "dry-run",
  generatedAt: new Date().toISOString(),
  pocketBaseUrl: PB_URL,
  totalCandidates: candidates.length,
  samples: updates.slice(0, 12),
};

fs.mkdirSync("reports", { recursive: true });

if (!apply) {
  const reportPath = path.join("reports", `normalizar-pacientes-fecha-nacimiento-medianoche-${timestamp}-dry-run.json`);
  fs.writeFileSync(reportPath, JSON.stringify(baseReport, null, 2));

  console.log("Dry-run finalizado.");
  console.log(`Pacientes candidatos: ${candidates.length}`);
  console.log(`Reporte: ${reportPath}`);
  console.log(`Para aplicar: node scripts/normalizar_pacientes_fecha_nacimiento_medianoche.mjs --apply --confirm=${APPLY_CONFIRMATION}`);
} else {
  await applyNormalization(baseReport);
}

async function listCandidates() {
  const candidates = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await getPacientesPage(page);
    totalPages = data.totalPages || 1;
    for (const paciente of data.items || []) {
      if (isExactMidnightUtc(paciente.fecha_nacimiento)) {
        candidates.push(paciente);
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
  const backupDir = path.join("data", "backups", "normalizar-pacientes-fecha-nacimiento-medianoche");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${timestamp}-backup.json`);
  fs.writeFileSync(backupPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    pocketBaseUrl: PB_URL,
    total: candidates.length,
    pacientes: candidates,
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
      await pb(`/api/collections/pacientes/records/${encodeURIComponent(update.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ fecha_nacimiento: update.nextFechaNacimiento }),
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

  const resultPath = path.join("reports", `normalizar-pacientes-fecha-nacimiento-medianoche-${timestamp}-resultado.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

  console.log("Aplicacion finalizada.");
  console.log(`Candidatos: ${candidates.length}`);
  console.log(`Actualizados: ${result.updated.length}`);
  console.log(`Errores: ${result.failed.length}`);
  console.log(`Restantes a medianoche UTC: ${result.remainingMidnightUtc}`);
  console.log(`Backup: ${backupPath}`);
  console.log(`Reporte: ${resultPath}`);

  if (result.failed.length > 0 || result.remainingMidnightUtc > 0) {
    process.exitCode = 1;
  }
}

async function getPacientesPage(page) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(PB_PER_PAGE),
    sort: "fecha_nacimiento,created",
    filter: 'fecha_nacimiento ~ " 00:00:00"',
    fields: "id,fecha_nacimiento,created,apellido,nombre,numero_documento,dni,numero_ficha",
  });

  return pb(`/api/collections/pacientes/records?${params}`);
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
