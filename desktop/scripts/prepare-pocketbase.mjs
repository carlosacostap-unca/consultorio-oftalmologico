import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "0.39.6";
const ARCHIVE = `pocketbase_${VERSION}_windows_amd64.zip`;
const RELEASE_ROOT = `https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}`;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const destination = path.resolve(scriptDir, "..", "pocketbase");
const archivePath = path.join(destination, ARCHIVE);
const executablePath = path.join(destination, "pocketbase.exe");
const markerPath = path.join(destination, ".prepared-version.json");

async function download(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`No se pudo descargar ${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function extractArchive(archiveFile, targetDirectory) {
  await new Promise((resolve, reject) => {
    const child = spawn("tar.exe", ["-xf", archiveFile, "-C", targetDirectory], { windowsHide: true, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`tar.exe finalizo con codigo ${code}`))));
  });
}

async function alreadyPrepared() {
  if (!existsSync(executablePath) || !existsSync(markerPath)) return false;
  try {
    const marker = JSON.parse(await readFile(markerPath, "utf8"));
    return marker.version === VERSION && marker.archive === ARCHIVE && /^[a-f0-9]{64}$/.test(marker.sha256);
  } catch {
    return false;
  }
}

await mkdir(destination, { recursive: true });
if (await alreadyPrepared()) {
  console.log(`PocketBase ${VERSION} ya esta preparado en ${executablePath}`);
  process.exit(0);
}

console.log(`Descargando checksums oficiales de PocketBase ${VERSION}...`);
const checksums = (await download(`${RELEASE_ROOT}/checksums.txt`)).toString("utf8");
const checksumLine = checksums.split(/\r?\n/).find((line) => line.trim().endsWith(ARCHIVE));
if (!checksumLine) throw new Error(`El archivo oficial no contiene el checksum de ${ARCHIVE}.`);
const expected = checksumLine.trim().split(/\s+/)[0].toLowerCase();
if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error("El checksum oficial no tiene formato SHA-256 valido.");

console.log(`Descargando ${ARCHIVE}...`);
const archive = await download(`${RELEASE_ROOT}/${ARCHIVE}`);
const actual = sha256(archive);
if (actual !== expected) throw new Error(`Checksum invalido para ${ARCHIVE}: esperado ${expected}, recibido ${actual}`);

await writeFile(archivePath, archive);
await rm(executablePath, { force: true });
await extractArchive(archivePath, destination);
if (!existsSync(executablePath)) throw new Error("La extraccion no genero pocketbase.exe.");
await writeFile(markerPath, `${JSON.stringify({ version: VERSION, archive: ARCHIVE, sha256: actual }, null, 2)}\n`);
await rm(archivePath, { force: true });
console.log(`PocketBase ${VERSION} preparado y verificado (${actual}).`);
