import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Sólo lectura. No restaura, borra, mueve ni modifica archivos de ninguna copia.
export async function verifyCopiedDesktopBackup(source, backup, expectedDeviceCode) {
  const [sourceRoot, backupRoot] = await Promise.all([realpath(source), realpath(backup)]);
  const inside = (parent, child) => {
    const relative = path.relative(parent, child);
    return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
  };
  if (inside(sourceRoot, backupRoot) || inside(backupRoot, sourceRoot)) {
    throw new Error("El respaldo debe estar fuera de la carpeta original y ser una copia independiente.");
  }
  const [originalFiles, copiedFiles] = await Promise.all([inventory(sourceRoot), inventory(backupRoot)]);
  if (JSON.stringify(originalFiles) !== JSON.stringify(copiedFiles)) throw new Error("La lista de archivos de ambas carpetas no coincide.");
  for (const required of ["device.json", "pocketbase/pb_data/data.db"]) {
    if (!originalFiles.includes(required)) throw new Error(`Falta el archivo necesario: ${required}`);
  }
  if (!originalFiles.some((name) => name.startsWith("secure/"))) throw new Error("Faltan los archivos de secure.");
  const device = JSON.parse(await readFile(path.join(sourceRoot, "device.json"), "utf8"));
  if (expectedDeviceCode && device.deviceCode !== expectedDeviceCode) throw new Error("El respaldo corresponde a otro equipo.");
  const aggregate = createHash("sha256");
  let bytes = 0;
  for (const file of originalFiles) {
    const [original, copied] = await Promise.all([hashFile(path.join(sourceRoot, ...file.split("/"))), hashFile(path.join(backupRoot, ...file.split("/")))]);
    if (original.size !== copied.size || original.hash !== copied.hash) throw new Error(`El contenido no coincide: ${file}`);
    bytes += original.size;
    aggregate.update(JSON.stringify([file, original.size, original.hash]) + "\n");
  }
  return { verifiedAt: new Date().toISOString(), deviceCode: device.deviceCode, matchingFiles: originalFiles.length,
    matchingBytes: bytes, sha256: aggregate.digest("hex"), bytesVerified: true, restorationVerified: false,
    nextStep: "Probar integridad SQLite y restauración de una tercera copia aislada; conservar originales y respaldo sin cambios." };
}

async function inventory(root, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(root, ...relative.split("/").filter(Boolean)), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error("No se aceptan enlaces simbólicos en el respaldo.");
    if (entry.isDirectory()) files.push(...await inventory(root, name));
    else if (entry.isFile()) files.push(name);
    else throw new Error("El respaldo contiene una entrada que no es archivo ni carpeta.");
  }
  return files.sort();
}

async function hashFile(file) {
  const before = await lstat(file);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  const after = await lstat(file);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error("La carpeta está cambiando: cerrá la aplicación antes de verificar.");
  return { size: before.size, hash: hash.digest("hex") };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argument = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
  try {
    const source = argument("--source");
    const backup = argument("--backup");
    if (!source || !backup) throw new Error("Uso: node scripts/verify_desktop_sync_backup.mjs --source <carpeta original> --backup <copia> --device-code PC-70DF9407");
    console.log(JSON.stringify(await verifyCopiedDesktopBackup(source, backup, argument("--device-code")), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
