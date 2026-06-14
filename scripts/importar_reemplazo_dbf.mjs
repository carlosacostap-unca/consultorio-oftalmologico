import fs from "node:fs";
import path from "node:path";
import { hasFlag } from "./env_utils.mjs";
import { buildLegacyDbfImportPlan, writeLegacyDbfImportPlan } from "./legacy_dbf_import_plan.mjs";
import {
  adminEnvFromArgs,
  createPocketBaseAdminClient,
  looksProductionPocketBaseUrl,
} from "./pocketbase_admin_utils.mjs";

const DATA_DIR = argValue("--data-dir") || "data";
const REPORT_DIR = argValue("--report-dir") || path.join(DATA_DIR, "reports", `legacy-dbf-import-apply-${timestampForPath(new Date())}`);
const APPLY = hasFlag("--apply");
const DELETE_EXISTING = hasFlag("--delete-existing");
const ALLOW_PRODUCTION = hasFlag("--allow-production");
const CONFIRM = argValue("--confirm");
const EXTERNAL_BACKUP_CONFIRM = argValue("--external-backup-confirm");
const CONCURRENCY = Number(argValue("--concurrency") || 10);
const PROGRESS_EVERY = Number(argValue("--progress-every") || 5000);
const RETRY_ATTEMPTS = Number(argValue("--retry-attempts") || 5);
const REQUIRED_CONFIRMATION = "REEMPLAZAR_DATOS_LEGACY_DBF";
const REQUIRED_BACKUP_CONFIRMATION = "BACKUP_POCKETBASE_VERIFICADO";
const DELETE_ORDER = ["consulta_eventos", "recetas", "turno_eventos", "turnos", "consultas", "pacientes", "mutuales"];

const plan = buildLegacyDbfImportPlan({ dataDir: DATA_DIR });
writeLegacyDbfImportPlan(plan, REPORT_DIR);

if (!APPLY) {
  printDryRun(plan, REPORT_DIR);
  process.exit(0);
}

assertApplyGuards();

const { envFile, env, url } = adminEnvFromArgs(".env.local");
const isProduction = looksProductionPocketBaseUrl(url);
if (isProduction && !ALLOW_PRODUCTION) {
  throw new Error("La URL parece produccion. Agrega --allow-production solo con aprobacion explicita.");
}

const pb = await createPocketBaseAdminClient({ url, env, envFile, name: "PocketBase" });
const result = {
  startedAt: new Date().toISOString(),
  pocketBaseUrl: pb.url,
  reportDir: REPORT_DIR,
  deleted: {},
  created: {
    mutuales: 0,
    pacientes: 0,
    consultas: 0,
    diagnosticosPaciente: 0,
  },
  skipped: {
    consultasHuerfanas: plan.consultas.orphan.length,
    consultasAmbiguas: plan.consultas.ambiguous.length,
  },
  errors: [],
};

console.log("--- Importacion de reemplazo DBF ---");
console.log(`PocketBase: ${pb.url}`);
console.log(`Reportes: ${REPORT_DIR}`);

if (DELETE_EXISTING) {
  for (const collection of DELETE_ORDER) {
    result.deleted[collection] = await deleteAll(pb, collection);
  }
} else {
  console.log("No se eliminaron registros existentes porque falta --delete-existing.");
  console.log("La importacion agregara registros si continua. Para reemplazo real, usar --delete-existing con backup validado.");
}

const mutualIds = await createMutuales(pb, plan.mutuales.records, result);
const patientIds = await createPacientes(pb, plan.pacientes.records, mutualIds, result);
await createConsultas(pb, plan.consultas.records, patientIds, result, "consultas");
await createConsultas(pb, plan.diagnosticosPaciente.records, patientIds, result, "diagnosticosPaciente");

result.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(REPORT_DIR, "import-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log("--- Resultado importacion ---");
console.log(JSON.stringify(result.created, null, 2));
console.log(`Omitidas huerfanas: ${result.skipped.consultasHuerfanas}`);
console.log(`Omitidas ambiguas: ${result.skipped.consultasAmbiguas}`);
console.log(`Errores: ${result.errors.length}`);
if (result.errors.length > 0) process.exitCode = 1;

async function createMutuales(pb, records, result) {
  const ids = new Map();
  console.log(`Creando mutuales: ${records.length}`);
  const outcomes = await runWithConcurrency(records, CONCURRENCY, async (record) => {
    const created = await pb.create("mutuales", record.payload);
    ids.set(record.legacyKey, created.id);
    result.created.mutuales += 1;
  }, "mutuales");
  result.errors.push(...outcomes.errors.map((error) => ({ stage: "mutuales", ...error })));
  return ids;
}

async function createPacientes(pb, records, mutualIds, result) {
  const ids = new Map();
  console.log(`Creando pacientes: ${records.length}`);
  const outcomes = await runWithConcurrency(records, CONCURRENCY, async (record) => {
    const payload = { ...record.payload };
    if (record.legacyMutualKey && mutualIds.has(record.legacyMutualKey)) {
      payload.mutual_id = mutualIds.get(record.legacyMutualKey);
    }
    const created = await pb.create("pacientes", payload);
    ids.set(record.legacyKey, created.id);
    result.created.pacientes += 1;
  }, "pacientes");
  result.errors.push(...outcomes.errors.map((error) => ({ stage: "pacientes", ...error })));
  return ids;
}

async function createConsultas(pb, records, patientIds, result, resultKey) {
  console.log(`Creando ${resultKey}: ${records.length}`);
  const outcomes = await runWithConcurrency(records, CONCURRENCY, async (record) => {
    const payload = { ...record.payload };
    if (record.legacyPatientKey && patientIds.has(record.legacyPatientKey)) {
      payload.paciente_id = patientIds.get(record.legacyPatientKey);
    }
    await pb.create("consultas", payload);
    result.created[resultKey] += 1;
  }, resultKey);
  result.errors.push(...outcomes.errors.map((error) => ({ stage: resultKey, ...error })));
}

async function deleteAll(pb, collection) {
  console.log(`Eliminando ${collection} existentes...`);
  let deleted = 0;
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      page: "1",
      perPage: "200",
      sort: "-created",
      fields: "id",
    });
    const data = await withRetries(() => pb.request(`/api/collections/${encodeURIComponent(collection)}/records?${params}`));
    if (data.items.length === 0) break;

    const outcomes = await runWithConcurrency(data.items, CONCURRENCY, async (item) => {
      await pb.delete(collection, item.id);
      deleted += 1;
    });

    if (outcomes.errors.length > 0) {
      throw new Error(`No se pudo eliminar ${collection}: ${JSON.stringify(outcomes.errors.slice(0, 3))}`);
    }

    if (page === 1 || page % 25 === 0) {
      console.log(`  ${collection}: eliminados ${deleted}/${data.totalItems}`);
    }
    page += 1;
  }

  console.log(`  ${collection}: eliminados ${deleted}`);
  return deleted;
}

async function runWithConcurrency(items, concurrency, worker, label = "items") {
  let index = 0;
  let completed = 0;
  const errors = [];

  async function runWorker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      try {
        await withRetries(() => worker(items[currentIndex], currentIndex));
      } catch (error) {
        errors.push({
          index: currentIndex,
          message: error.message,
        });
      } finally {
        completed += 1;
        if (completed === items.length || completed % PROGRESS_EVERY === 0) {
          console.log(`  ${label}: ${completed}/${items.length}`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return { errors };
}

async function withRetries(action) {
  let lastError;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_ATTEMPTS) break;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function assertApplyGuards() {
  if (CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(`Para --apply debes indicar --confirm=${REQUIRED_CONFIRMATION}.`);
  }
  if (EXTERNAL_BACKUP_CONFIRM !== REQUIRED_BACKUP_CONFIRMATION) {
    throw new Error(`Confirma el backup externo con --external-backup-confirm=${REQUIRED_BACKUP_CONFIRMATION}.`);
  }
}

function printDryRun(plan, reportDir) {
  console.log("--- Dry-run importacion reemplazo DBF ---");
  console.log(`Reportes: ${reportDir}`);
  console.log(`Mutuales a crear: ${plan.summary.mutualesAImportar}`);
  console.log(`Pacientes a crear: ${plan.summary.pacientesAImportar}`);
  console.log(`Consultas seguras a crear: ${plan.summary.consultasSegurasAImportar}`);
  console.log(`Diagnosticos legacy a crear: ${plan.summary.diagnosticosPacienteAImportar}`);
  console.log(`Consultas huerfanas omitidas: ${plan.summary.consultasHuerfanas}`);
  console.log(`Consultas ambiguas omitidas: ${plan.summary.consultasAmbiguas}`);
  console.log("No se aplicaron cambios en PocketBase.");
}

function timestampForPath(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function argValue(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}
