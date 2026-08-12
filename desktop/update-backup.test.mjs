import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import test from "node:test";
import {
  createVerifiedDesktopBackup,
  verifyDesktopBackup,
} from "./update-backup.mjs";

test("respalda y verifica base, identidad, secretos cifrados y estado técnico", async () => {
  const dataRoot = await testDataRoot();
  const result = await createVerifiedDesktopBackup({
    dataRoot,
    sourceVersion: "0.1.1",
    targetVersion: "0.2.0",
    technicalState: { pending: 3, errors: 1, conflicts: 2, updateVersion: "0.2.0", token: "no-copiar" },
    availableBytes: 1024 * 1024 * 1024,
  });
  const manifest = await verifyDesktopBackup(result.directory);
  assert.equal(manifest.sourceVersion, "0.1.1");
  assert.equal(await readFile(path.join(result.directory, "device.json"), "utf8"), '{"deviceId":"device-a"}\n');
  assert.equal((await readFile(path.join(result.directory, "secure", "desktop-activation.bin"))).toString(), "encrypted");
  const technical = JSON.parse(await readFile(path.join(result.directory, "technical", "runtime-state.json"), "utf8"));
  assert.deepEqual({ pending: technical.pending, errors: technical.errors, conflicts: technical.conflicts }, { pending: 3, errors: 1, conflicts: 2 });
  assert.equal("token" in technical, false);
});

test("detecta un respaldo alterado", async () => {
  const dataRoot = await testDataRoot();
  const result = await createVerifiedDesktopBackup({
    dataRoot, sourceVersion: "0.1.1", targetVersion: "0.2.0", availableBytes: 1024 * 1024 * 1024,
  });
  await writeFile(path.join(result.directory, "pocketbase", "pb_data", "data.db"), "corrupta");
  await assert.rejects(verifyDesktopBackup(result.directory), /respaldo inválido|Hash de respaldo inválido|Archivo de respaldo inválido/);
});

test("rechaza espacio insuficiente sin dejar un respaldo final", async () => {
  const dataRoot = await testDataRoot();
  await assert.rejects(createVerifiedDesktopBackup({
    dataRoot, sourceVersion: "0.1.1", targetVersion: "0.2.0", availableBytes: 1,
  }), /Espacio insuficiente/);
  await assert.rejects(access(path.join(dataRoot, "backups")));
});

test("conserva los tres respaldos válidos más recientes", async () => {
  const dataRoot = await testDataRoot();
  const directories = [];
  for (let day = 1; day <= 4; day += 1) {
    const result = await createVerifiedDesktopBackup({
      dataRoot,
      sourceVersion: "0.1.1",
      targetVersion: `0.2.${day}`,
      now: new Date(`2026-08-0${day}T10:00:00.000Z`),
      availableBytes: 1024 * 1024 * 1024,
    });
    directories.push(result.directory);
  }
  await assert.rejects(access(directories[0]));
  for (const directory of directories.slice(1)) await access(directory);
});

async function testDataRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "consultorio-backup-"));
  await mkdir(path.join(root, "pocketbase", "pb_data"), { recursive: true });
  await mkdir(path.join(root, "secure"), { recursive: true });
  await writeFile(path.join(root, "device.json"), '{"deviceId":"device-a"}\n');
  await writeFile(path.join(root, "pocketbase", "pb_data", "data.db"), "database-with-pending-operations-and-conflicts");
  await writeFile(path.join(root, "secure", "desktop-activation.bin"), "encrypted");
  return root;
}
