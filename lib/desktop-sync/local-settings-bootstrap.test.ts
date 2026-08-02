import assert from "node:assert/strict";
import test from "node:test";
import { upsertLocalBootstrapRecord } from "./local-settings-bootstrap.ts";

test("delega system_settings únicamente al IPC privilegiado", async () => {
  const privileged: unknown[] = [];
  const direct: unknown[] = [];
  const item = { id: "abc123def456ghi", key: "consultorio", value: { nombre: "Central" }, created: "ignorado" };

  await upsertLocalBootstrapRecord("system_settings", item, {
    upsertSystemSetting: async (input) => { privileged.push(input); },
    upsertRecord: async (...args) => { direct.push(args); },
  });

  assert.deepEqual(privileged, [{ id: item.id, key: item.key, value: item.value }]);
  assert.deepEqual(direct, []);
});

test("mantiene las demás colecciones en el cliente PocketBase", async () => {
  const privileged: unknown[] = [];
  const direct: unknown[] = [];
  const item = { id: "abc123def456ghi", nombre: "Mutual" };

  await upsertLocalBootstrapRecord("mutuales", item, {
    upsertSystemSetting: async (input) => { privileged.push(input); },
    upsertRecord: async (...args) => { direct.push(args); },
  });

  assert.deepEqual(privileged, []);
  assert.deepEqual(direct, [["mutuales", item]]);
});
