import fs from "node:fs";
import path from "node:path";
import {
  envFileFromArgs,
  loadEnvFile,
  pocketBaseUrl,
} from "./env_utils.mjs";

const envFile = envFileFromArgs(".env.local");
const env = loadEnvFile(envFile, { required: true });
const PB_URL = pocketBaseUrl({ ...process.env, ...env });
const APPLY = process.argv.includes("--apply");
const CONFIRM = process.argv.includes("--confirm-backfill-consulta-eventos");
const SINCE = argValue("--since") || "2026-06-17";
const PER_PAGE = Number(argValue("--per-page") || 200);
const REPORT_DIR = "reports";

if (!PB_URL) throw new Error("POCKETBASE_URL o NEXT_PUBLIC_POCKETBASE_URL es requerido.");
if (APPLY && !CONFIRM) {
  throw new Error("Para aplicar usa --apply --confirm-backfill-consulta-eventos.");
}

const token = await adminToken();
const sinceFilterValue = normalizeSince(SINCE);
const report = {
  mode: APPLY ? "apply" : "dry-run",
  since: sinceFilterValue,
  generatedAt: new Date().toISOString(),
  pocketBaseHost: new URL(PB_URL).host,
  totalConsultasInspected: 0,
  consultasWithoutEvents: 0,
  eventsCreated: 0,
  failures: [],
  sample: [],
};

const doctorsById = new Map();
let page = 1;
let totalPages = 1;

do {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(PER_PAGE),
    sort: "created",
    filter: `created >= "${sinceFilterValue}"`,
    fields: "id,paciente_id,medico_id,fecha,estado,motivo_consulta,diagnostico,tratamiento,created,updated",
  });
  const result = await pb(`/api/collections/consultas/records?${params}`);
  totalPages = result.totalPages || 1;
  report.totalConsultasInspected += result.items.length;

  for (const consulta of result.items) {
    const events = await listEventsForConsulta(consulta.id);
    if (events.totalItems > 0) continue;

    report.consultasWithoutEvents += 1;
    const doctor = await doctorForConsulta(consulta.medico_id);
    const entry = {
      id: consulta.id,
      paciente_id: consulta.paciente_id || "",
      medico_id: consulta.medico_id || "",
      medico_nombre: actorName(doctor),
      fecha: consulta.fecha || "",
      estado: consulta.estado || "",
      motivo_consulta: consulta.motivo_consulta || "",
      created: consulta.created || "",
    };
    if (report.sample.length < 30) report.sample.push(entry);

    if (!APPLY) continue;

    try {
      await pb("/api/collections/consulta_eventos/records", {
        method: "POST",
        body: JSON.stringify({
          consulta_id: consulta.id,
          paciente_id: consulta.paciente_id || null,
          actor_id: consulta.medico_id || null,
          actor_nombre: actorName(doctor),
          tipo: "created",
          titulo: "Consulta registrada en auditoria",
          detalle: "Evento creado retroactivamente para reparar una consulta sin historial de auditoria.",
          metadata: {
            backfill: true,
            source: "scripts/backfill_consulta_eventos.mjs",
            consulta_created: consulta.created || null,
            consulta_updated: consulta.updated || null,
            fecha: consulta.fecha || null,
            estado: consulta.estado || null,
            medico_id: consulta.medico_id || null,
            motivo_consulta: consulta.motivo_consulta || null,
          },
        }),
      });
      report.eventsCreated += 1;
    } catch (error) {
      report.failures.push({
        consulta_id: consulta.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(`Pagina ${page}/${totalPages}: revisadas=${report.totalConsultasInspected}, sinEventos=${report.consultasWithoutEvents}, creados=${report.eventsCreated}, errores=${report.failures.length}`);
  page += 1;
} while (page <= totalPages);

fs.mkdirSync(REPORT_DIR, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportPath = path.join(REPORT_DIR, `backfill-consulta-eventos-${timestamp}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`Reporte: ${reportPath}`);
console.log(`Consultas revisadas: ${report.totalConsultasInspected}`);
console.log(`Consultas sin eventos: ${report.consultasWithoutEvents}`);
console.log(`Eventos creados: ${report.eventsCreated}`);
console.log(`Errores: ${report.failures.length}`);

if (report.failures.length > 0) {
  process.exitCode = 1;
}

function argValue(name) {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex !== -1 && process.argv[exactIndex + 1]) return process.argv[exactIndex + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}

function normalizeSince(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "2026-06-17 00:00:00";
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed} 00:00:00` : trimmed;
}

async function listEventsForConsulta(consultaId) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    filter: `consulta_id = "${escapeFilterValue(consultaId)}"`,
    fields: "id",
  });
  return pb(`/api/collections/consulta_eventos/records?${params}`);
}

async function doctorForConsulta(medicoId) {
  if (!medicoId) return null;
  if (doctorsById.has(medicoId)) return doctorsById.get(medicoId);

  const doctor = await pb(`/api/collections/users/records/${encodeURIComponent(medicoId)}?fields=id,name,email`).catch(() => null);
  doctorsById.set(medicoId, doctor);
  return doctor;
}

function actorName(doctor) {
  return doctor?.name || doctor?.email || "Sistema de auditoria";
}

function escapeFilterValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function adminToken() {
  if (env.POCKETBASE_ADMIN_TOKEN) return env.POCKETBASE_ADMIN_TOKEN;
  if (!env.POCKETBASE_ADMIN_EMAIL || !env.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura POCKETBASE_ADMIN_TOKEN o POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD en ${envFile}`);
  }

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
    if (response.ok) return (await response.json()).token;
  }

  throw new Error("No se pudo autenticar contra PocketBase.");
}

async function pb(requestPath, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${PB_URL}${requestPath}`, { ...options, headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`PocketBase ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}
