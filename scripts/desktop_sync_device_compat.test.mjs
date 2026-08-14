import assert from "node:assert/strict";
import test from "node:test";
import {
  assertUniqueDesktopDeviceBackfills,
  buildDesktopDeviceBackfill,
  changedDesktopDeviceFields,
  mergePocketBaseIndexes,
  missingPocketBaseIndexes,
  transitionalDesktopDeviceFields,
} from "./desktop_sync_device_compat.mjs";

test("completa un registro legacy sin borrar su contrato anterior", () => {
  const record = {
    id: "legacy-a",
    device_key: "e24d57f3-1111-2222-3333-444455556666",
    nombre: "Carlos",
    modo: "desktop",
    habilitado: true,
    usuario_id: "admin-a",
    activated_at: "2026-08-01T00:00:00.000Z",
    ultimo_contacto_at: "2026-08-12T00:00:00.000Z",
    metadata: { appVersion: "0.1.3" },
  };
  const payload = buildDesktopDeviceBackfill(record);

  assert.equal(payload.device_id, record.device_key);
  assert.equal(payload.device_key, record.device_key);
  assert.equal(payload.code, "PCE24D57");
  assert.equal(payload.name, record.nombre);
  assert.equal(payload.nombre, record.nombre);
  assert.equal(payload.enabled, true);
  assert.equal(payload.habilitado, true);
  assert.equal(payload.activated_by, record.usuario_id);
  assert.equal(payload.usuario_id, record.usuario_id);
  assert.equal(payload.installed_version, "0.1.3");
  assert.equal(payload.update_channel, "stable");
  assert.equal(payload.updates_enabled, false);
  assert.ok(changedDesktopDeviceFields(record, payload).includes("device_id"));
});

test("el backfill es idempotente", () => {
  const first = buildDesktopDeviceBackfill({
    id: "current-a",
    device_id: "device-current-1234",
    device_key: "device-current-1234",
    code: "PCCURREN",
    name: "Equipo",
    nombre: "Equipo",
    enabled: true,
    habilitado: true,
    modo: "desktop",
    activated_by: "admin-a",
    usuario_id: "admin-a",
    update_channel: "pilot",
    updates_enabled: true,
    installed_version: "0.1.3",
  });
  assert.deepEqual(changedDesktopDeviceFields(first, buildDesktopDeviceBackfill(first)), []);
});

test("rechaza identidad faltante o colisiones antes de crear índices", () => {
  assert.throws(() => buildDesktopDeviceBackfill({ id: "broken" }), /no tiene identidad/);
  assert.throws(() => assertUniqueDesktopDeviceBackfills([
    { id: "a", payload: { device_id: "same", code: "PCA" } },
    { id: "b", payload: { device_id: "same", code: "PCB" } },
  ]), /comparten device_id/);
  assert.throws(() => assertUniqueDesktopDeviceBackfills([
    { id: "a", payload: { device_id: "one", code: "SAME" } },
    { id: "b", payload: { device_id: "two", code: "SAME" } },
  ]), /comparten code/);
});

test("reconoce índices legacy aunque PocketBase cambie el formato SQL", () => {
  const existing = ["CREATE UNIQUE INDEX idx_sync_devices_device_key ON sync_devices (device_key)"];
  const required = [
    "CREATE UNIQUE INDEX `idx_sync_devices_device_key` ON `sync_devices` (`device_key`)",
    "CREATE UNIQUE INDEX `idx_sync_devices_device_id` ON `sync_devices` (`device_id`)",
  ];

  assert.deepEqual(missingPocketBaseIndexes(existing, required), [required[1]]);
  assert.deepEqual(mergePocketBaseIndexes(existing, required), [existing[0], required[1]]);
});

test("agrega ambos contratos de identidad como opcionales antes del backfill", () => {
  const fields = [
    { name: "device_key", required: true },
    { name: "modo", required: true },
    { name: "device_id", required: true },
    { name: "code", required: true },
    { name: "unrelated_required", required: true },
  ];

  const transitional = transitionalDesktopDeviceFields(fields);
  assert.deepEqual(
    transitional.map((field) => [field.name, field.required]),
    [
      ["device_key", false],
      ["modo", false],
      ["device_id", false],
      ["code", false],
      ["unrelated_required", true],
    ],
  );
  assert.equal(fields[0].required, true);
});
