import assert from "node:assert/strict";
import test from "node:test";
import {
  desktopDeviceActivationPayload,
  desktopDeviceFieldFilter,
  desktopDeviceTouchPayload,
  legacyCodeFromDeviceId,
  lookupDesktopDeviceRecord,
  mapDesktopDeviceRecord,
} from "./device-record-compat.ts";

test("busca equipos por identidad actual o legacy sin permitir inyeccion de filtro", () => {
  assert.equal(
    desktopDeviceFieldFilter("device_id", 'device-123" || enabled = true'),
    'device_id = "device-123\\" || enabled = true"',
  );
});

test("reintenta por device_key cuando el esquema todavía no tiene device_id", async () => {
  const queried: string[] = [];
  const record = await lookupDesktopDeviceRecord("legacy-device", async (field) => {
    queried.push(field);
    if (field === "device_id") throw new Error("PocketBase 400: filtro desconocido");
    return { id: "legacy-a", device_key: "legacy-device" };
  });
  assert.deepEqual(queried, ["device_id", "device_key"]);
  assert.equal(record?.id, "legacy-a");
});

test("normaliza un registro legacy al contrato actual", () => {
  assert.deepEqual(mapDesktopDeviceRecord({
    id: "record-a",
    device_key: "e24d57f3-1111-2222-3333-444455556666",
    nombre: "Carlos",
    habilitado: true,
    enabled: false,
    usuario_id: "admin-a",
    activated_at: "2026-08-01T00:00:00.000Z",
    ultimo_contacto_at: "2026-08-12T00:00:00.000Z",
  }), {
    id: "record-a",
    deviceId: "e24d57f3-1111-2222-3333-444455556666",
    code: "PCE24D57",
    name: "Carlos",
    enabled: true,
    activatedBy: "admin-a",
    activatedAt: "2026-08-01T00:00:00.000Z",
    lastSeenAt: "2026-08-12T00:00:00.000Z",
    lastSyncAt: undefined,
    appVersion: undefined,
    updateChannel: "stable",
    updatesEnabled: false,
    installedVersion: undefined,
    lastUpdateStatus: undefined,
    lastUpdateAt: undefined,
    lastUpdateVersion: undefined,
    lastUpdateCode: undefined,
  });
  assert.equal(legacyCodeFromDeviceId("e24d57f3-1111"), "PCE24D57");
});

test("la activacion satisface simultaneamente ambos esquemas", () => {
  const payload = desktopDeviceActivationPayload({
    deviceId: "e24d57f3-1111-2222-3333-444455556666",
    code: "PCE24D57",
    name: "Carlos",
    appVersion: "0.1.3",
    actorId: "admin-a",
    now: "2026-08-12T12:00:00.000Z",
    existing: { modo: "desktop", usuario_id: "admin-old", activated_at: "2026-08-01T00:00:00.000Z" },
  });

  assert.equal(payload.device_id, payload.device_key);
  assert.equal(payload.name, payload.nombre);
  assert.equal(payload.enabled, payload.habilitado);
  assert.equal(payload.activated_by, "admin-old");
  assert.equal(payload.usuario_id, "admin-old");
  assert.equal(payload.update_channel, "stable");
  assert.equal(payload.updates_enabled, false);
});

test("el contacto actualiza fechas actuales y legacy", () => {
  assert.deepEqual(desktopDeviceTouchPayload({ lastSeenAt: "2026-08-12T13:00:00.000Z", lastSyncAt: "2026-08-12T13:01:00.000Z" }), {
    last_seen_at: "2026-08-12T13:00:00.000Z",
    ultimo_contacto_at: "2026-08-12T13:00:00.000Z",
    last_sync_at: "2026-08-12T13:01:00.000Z",
  });
});
