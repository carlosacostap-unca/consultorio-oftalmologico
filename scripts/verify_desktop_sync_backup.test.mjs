import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyCopiedDesktopBackup } from "./verify_desktop_sync_backup.mjs";

test("verificación de copia rechaza corrupción y otro equipo sin modificar el original", async () => {
  await mkdir(path.resolve(".tmp"), { recursive: true });
  const root = await mkdtemp(path.resolve(".tmp/backup-preservation-test-"));
  const source = path.join(root, "original");
  const backup = path.join(root, "backup");
  await mkdir(path.join(source, "pocketbase", "pb_data"), { recursive: true });
  await mkdir(path.join(source, "secure"));
  await writeFile(path.join(source, "device.json"), JSON.stringify({ deviceCode: "PC-FIXTURE" }));
  const dbFile = path.join(source, "pocketbase", "pb_data", "data.db");
  await writeFile(dbFile, "datos ficticios para comprobar hashes");
  await writeFile(path.join(source, "secure", "fixture.bin"), "secreto ficticio");
  await cp(source, backup, { recursive: true });
  const original = await readFile(dbFile);
  const result = await verifyCopiedDesktopBackup(source, backup, "PC-FIXTURE");
  assert.equal(result.bytesVerified, true);
  assert.equal(result.restorationVerified, false);
  assert.equal(result.matchingFiles, 3);
  await assert.rejects(verifyCopiedDesktopBackup(source, backup, "PC-OTHER"), /otro equipo/);
  await assert.rejects(verifyCopiedDesktopBackup(source, source), /copia independiente/);
  await writeFile(path.join(backup, "pocketbase", "pb_data", "data.db"), "dato alterado");
  await assert.rejects(verifyCopiedDesktopBackup(source, backup), /contenido no coincide/);
  assert.deepEqual(await readFile(dbFile), original);
});
