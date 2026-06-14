import fs from "node:fs";
import path from "node:path";
import { hasFlag } from "./env_utils.mjs";
import {
  adminEnvFromArgs,
  createPocketBaseAdminClient,
  looksProductionPocketBaseUrl,
} from "./pocketbase_admin_utils.mjs";

const APPLY = hasFlag("--apply");
const BACKUP_ONLY = hasFlag("--backup-only");
const ALLOW_PRODUCTION = hasFlag("--allow-production");
const CONFIRM = argValue("--confirm");
const BACKUP_DIR = argValue("--backup-dir") || path.join("data", "backups", `legacy-dbf-replace-${timestampForPath(new Date())}`);
const COLLECTIONS = (argValue("--collections") || "consulta_eventos,recetas,turno_eventos,turnos,consultas,pacientes,mutuales")
  .split(",")
  .map((collection) => collection.trim())
  .filter(Boolean);
const REQUIRED_CONFIRMATION = "REEMPLAZAR_DATOS_LEGACY_DBF";
const PER_PAGE = Number(argValue("--per-page") || 500);

if (!APPLY && !BACKUP_ONLY) {
  console.log("Modo seguro: no se aplicaron cambios.");
  console.log("Usa --backup-only para exportar un backup administrativo de mutuales, pacientes y consultas.");
  console.log("El reemplazo real requerira --apply --confirm=REEMPLAZAR_DATOS_LEGACY_DBF y backup previo.");
  process.exit(0);
}

const { envFile, env, url } = adminEnvFromArgs(".env.local");
const isProduction = looksProductionPocketBaseUrl(url);

if (APPLY) {
  assertApplyGuards({ isProduction });
}

const pb = await createPocketBaseAdminClient({ url, env, envFile, name: "PocketBase" });

console.log("--- Preparacion de reemplazo DBF ---");
console.log(`PocketBase: ${pb.url}`);
console.log(`Entorno: ${envFile}`);
console.log(`Modo: ${BACKUP_ONLY ? "backup-only" : APPLY ? "apply" : "seguro"}`);

if (BACKUP_ONLY || APPLY) {
  await exportBackup(pb, BACKUP_DIR);
}

if (APPLY) {
  console.log("Backup listo. La escritura destructiva aun no esta implementada en este script.");
  console.log("Se mantiene bloqueado el reemplazo real hasta completar las tareas de importacion 3.4 a 3.8.");
}

function assertApplyGuards({ isProduction }) {
  if (CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(`Para --apply debes indicar --confirm=${REQUIRED_CONFIRMATION}.`);
  }

  if (isProduction && !ALLOW_PRODUCTION) {
    throw new Error("La URL parece produccion. Agrega --allow-production solo cuando exista aprobacion explicita y backup validado.");
  }
}

async function exportBackup(pb, backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    pocketBaseUrl: pb.url,
    format: "jsonl",
    perPage: PER_PAGE,
    collections: {},
  };

  for (const collection of COLLECTIONS) {
    console.log(`Exportando ${collection}...`);
    const outputPath = path.join(backupDir, `${collection}.jsonl`);
    const result = await exportCollectionJsonl(pb, collection, outputPath);
    manifest.collections[collection] = {
      count: result.count,
      file: outputPath,
      pages: result.pages,
    };
    console.log(`  ${collection}: ${result.count} registros`);
  }

  fs.writeFileSync(path.join(backupDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Backup exportado en ${backupDir}`);
}

async function exportCollectionJsonl(pb, collection, outputPath) {
  const partialPath = `${outputPath}.partial`;
  if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath);
  const stream = fs.createWriteStream(partialPath, { encoding: "utf8" });
  let page = 1;
  let totalPages = 1;
  let count = 0;

  try {
    do {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(PER_PAGE),
        sort: "created",
      });
      const data = await pb.request(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
      totalPages = data.totalPages;

      for (const item of data.items) {
        stream.write(`${JSON.stringify(item)}\n`);
        count += 1;
      }

      if (page === 1 || page === totalPages || page % 25 === 0) {
        console.log(`  pagina ${page}/${totalPages}, registros ${count}/${data.totalItems}`);
      }
      page += 1;
    } while (page <= totalPages);
  } finally {
    await new Promise((resolve, reject) => {
      stream.end((error) => (error ? reject(error) : resolve()));
    });
  }

  fs.renameSync(partialPath, outputPath);
  return { count, pages: totalPages };
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
