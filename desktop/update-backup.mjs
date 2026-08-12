import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  statfs,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./update-integrity.mjs";

const MANIFEST_FILE = "backup-manifest.json";
const REQUIRED_DIRECTORIES = ["pocketbase/pb_data", "secure", "technical"];
const MINIMUM_FREE_MARGIN = 64 * 1024 * 1024;
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export async function createVerifiedDesktopBackup({
  dataRoot,
  sourceVersion,
  targetVersion,
  technicalState = {},
  now = new Date(),
  availableBytes,
  retention = 3,
}) {
  assertVersion(sourceVersion, "origen");
  assertVersion(targetVersion, "destino");
  if (!Number.isSafeInteger(retention) || retention < 3) throw new Error("La retención mínima es de tres respaldos.");

  const root = path.resolve(dataRoot);
  const sources = [
    { source: path.join(root, "device.json"), destination: "device.json", type: "file" },
    { source: path.join(root, "pocketbase", "pb_data"), destination: "pocketbase/pb_data", type: "directory" },
    { source: path.join(root, "secure"), destination: "secure", type: "directory" },
  ];
  const sourceFiles = [];
  for (const source of sources) {
    await assertExpectedType(source.source, source.type);
    if (source.type === "file") sourceFiles.push({ source: source.source, destination: source.destination });
    else sourceFiles.push(...await collectFiles(source.source, source.destination));
  }
  if (!sourceFiles.some((file) => file.destination.startsWith("pocketbase/pb_data/"))) {
    throw new Error("La base local no contiene archivos para respaldar.");
  }

  const totalSourceBytes = (await Promise.all(sourceFiles.map(async (file) => (await lstat(file.source)).size)))
    .reduce((total, size) => total + size, 0);
  const freeBytes = availableBytes ?? await filesystemAvailableBytes(root);
  if (freeBytes < totalSourceBytes + Math.max(MINIMUM_FREE_MARGIN, Math.ceil(totalSourceBytes * 0.25))) {
    throw new Error("Espacio insuficiente para crear y verificar el respaldo previo.");
  }

  const backupsRoot = path.join(root, "backups");
  await mkdir(backupsRoot, { recursive: true });
  const identifier = `${formatTimestamp(now)}-${randomUUID().slice(0, 8)}`;
  const staging = path.join(backupsRoot, `.creating-${identifier}`);
  const finalDirectory = path.join(backupsRoot, `backup-${identifier}`);
  await mkdir(staging, { recursive: false });

  try {
    for (const directory of REQUIRED_DIRECTORIES) await mkdir(path.join(staging, ...directory.split("/")), { recursive: true });
    for (const file of sourceFiles) {
      const destination = resolveBackupPath(staging, file.destination);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(file.source, destination);
    }
    await writeFile(
      resolveBackupPath(staging, "technical/runtime-state.json"),
      canonicalJson(sanitizeTechnicalState(technicalState)),
      "utf8",
    );

    const copiedFiles = await collectFiles(staging, "");
    const manifestFiles = [];
    for (const file of copiedFiles.filter((item) => item.destination !== MANIFEST_FILE)) {
      const contents = await readFile(file.source);
      manifestFiles.push({
        path: file.destination,
        size: contents.byteLength,
        sha512: createHash("sha512").update(contents).digest("base64"),
      });
    }
    manifestFiles.sort((left, right) => left.path.localeCompare(right.path, "en"));
    const manifest = {
      schemaVersion: 1,
      createdAt: now.toISOString(),
      sourceVersion,
      targetVersion,
      requiredDirectories: REQUIRED_DIRECTORIES,
      files: manifestFiles,
    };
    await writeFile(path.join(staging, MANIFEST_FILE), canonicalJson(manifest), "utf8");
    await verifyDesktopBackup(staging);
    await rename(staging, finalDirectory);
    await verifyDesktopBackup(finalDirectory);
    await applyDesktopBackupRetention(backupsRoot, retention);
    return { directory: finalDirectory, manifest };
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

export async function verifyDesktopBackup(backupDirectory) {
  const root = path.resolve(backupDirectory);
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("Directorio de respaldo inválido.");
  const manifest = JSON.parse(await readFile(path.join(root, MANIFEST_FILE), "utf8"));
  if (
    !manifest
    || manifest.schemaVersion !== 1
    || typeof manifest.createdAt !== "string"
    || Number.isNaN(Date.parse(manifest.createdAt))
    || !SEMVER_PATTERN.test(manifest.sourceVersion)
    || !SEMVER_PATTERN.test(manifest.targetVersion)
    || !Array.isArray(manifest.files)
    || !Array.isArray(manifest.requiredDirectories)
  ) throw new Error("Manifiesto de respaldo inválido.");
  if (REQUIRED_DIRECTORIES.some((directory) => !manifest.requiredDirectories.includes(directory))) {
    throw new Error("El respaldo no declara todos los directorios indispensables.");
  }
  for (const directory of REQUIRED_DIRECTORIES) await assertExpectedType(resolveBackupPath(root, directory), "directory");

  const seen = new Set();
  for (const file of manifest.files) {
    const relative = safeRelativePath(file?.path);
    if (seen.has(relative)) throw new Error("El manifiesto de respaldo contiene rutas duplicadas.");
    seen.add(relative);
    if (!Number.isSafeInteger(file?.size) || file.size < 0 || !/^[A-Za-z0-9+/]{86}==$/.test(file?.sha512 || "")) {
      throw new Error("Entrada de archivo de respaldo inválida.");
    }
    const absolute = resolveBackupPath(root, relative);
    const info = await lstat(absolute);
    if (!info.isFile() || info.isSymbolicLink() || info.size !== file.size) throw new Error(`Archivo de respaldo inválido: ${relative}`);
    const digest = createHash("sha512").update(await readFile(absolute)).digest("base64");
    if (digest !== file.sha512) throw new Error(`Hash de respaldo inválido: ${relative}`);
  }
  if (!seen.has("device.json") || !seen.has("technical/runtime-state.json") || ![...seen].some((value) => value.startsWith("pocketbase/pb_data/"))) {
    throw new Error("El respaldo no contiene identidad, estado técnico y base local.");
  }
  return manifest;
}

export async function applyDesktopBackupRetention(backupsRoot, retention = 3) {
  if (!Number.isSafeInteger(retention) || retention < 3) throw new Error("La retención mínima es de tres respaldos.");
  const root = path.resolve(backupsRoot);
  await mkdir(root, { recursive: true });
  const entries = await readdir(root, { withFileTypes: true });
  const valid = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^backup-[0-9TZ-]+-[a-f0-9]{8}$/.test(entry.name)) continue;
    const directory = path.join(root, entry.name);
    try {
      const manifest = await verifyDesktopBackup(directory);
      valid.push({ directory, createdAt: Date.parse(manifest.createdAt) });
    } catch {
      // Los respaldos inválidos se preservan para diagnóstico y nunca cuentan para la retención válida.
    }
  }
  valid.sort((left, right) => right.createdAt - left.createdAt);
  for (const backup of valid.slice(retention)) {
    if (path.dirname(backup.directory) !== root) throw new Error("Ruta de retención fuera del directorio de respaldos.");
    await rm(backup.directory, { recursive: true, force: false });
  }
}

async function collectFiles(root, destinationRoot) {
  const files = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const source = path.join(root, entry.name);
    const destination = [destinationRoot, entry.name].filter(Boolean).join("/");
    const info = await lstat(source);
    if (info.isSymbolicLink()) throw new Error("El respaldo no admite enlaces simbólicos.");
    if (info.isDirectory()) files.push(...await collectFiles(source, destination));
    else if (info.isFile()) files.push({ source, destination: safeRelativePath(destination) });
    else throw new Error("El respaldo encontró un tipo de archivo no admitido.");
  }
  return files;
}

async function assertExpectedType(target, expected) {
  const info = await lstat(target).catch(() => null);
  const valid = expected === "file" ? info?.isFile() : info?.isDirectory();
  if (!valid || info?.isSymbolicLink()) throw new Error(`Falta un ${expected === "file" ? "archivo" : "directorio"} durable requerido.`);
}

async function filesystemAvailableBytes(target) {
  const information = await statfs(target);
  return Number(information.bavail) * Number(information.bsize);
}

function resolveBackupPath(root, relative) {
  const safe = safeRelativePath(relative);
  const absolute = path.resolve(root, ...safe.split("/"));
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) throw new Error("Ruta fuera del respaldo.");
  return absolute;
}

function safeRelativePath(value) {
  const normalized = String(value || "").replaceAll("\\", "/").normalize("NFC");
  if (!normalized || normalized.startsWith("/") || normalized.includes("../") || normalized.includes("/..") || normalized.includes("\0")) {
    throw new Error("Ruta relativa de respaldo inválida.");
  }
  return normalized.split("/").filter(Boolean).join("/");
}

function sanitizeTechnicalState(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    capturedAt: new Date().toISOString(),
    pending: safeCount(source.pending),
    errors: safeCount(source.errors),
    conflicts: safeCount(source.conflicts),
    updateVersion: typeof source.updateVersion === "string" && SEMVER_PATTERN.test(source.updateVersion) ? source.updateVersion : null,
  };
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function assertVersion(value, label) {
  if (typeof value !== "string" || !SEMVER_PATTERN.test(value)) throw new Error(`Versión de ${label} inválida.`);
}

function formatTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new Error("Fecha de respaldo inválida.");
  return date.toISOString().replace(/[:.]/g, "-");
}
