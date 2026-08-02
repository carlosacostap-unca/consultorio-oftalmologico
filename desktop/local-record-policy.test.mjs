import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLocalSystemSetting, normalizeLocalUserId } from "./local-record-policy.mjs";

test("acepta únicamente IDs PocketBase de usuario válidos", () => {
  assert.equal(normalizeLocalUserId(" ddiqxk2q17zfy2a "), "ddiqxk2q17zfy2a");

  for (const value of [
    "",
    "corto",
    "abcdefghijklmnop",
    "DDIQXK2Q17ZFY2A",
    "../../usuarios",
    { id: "ddiqxk2q17zfy2a" },
  ]) {
    assert.throws(() => normalizeLocalUserId(value), /Identificador de usuario local inválido/);
  }
});

test("normaliza únicamente un registro válido de system_settings", () => {
  assert.deepEqual(
    normalizeLocalSystemSetting({ id: "abc123def456ghi", key: " consultorio ", value: { nombre: "Central" } }),
    { id: "abc123def456ghi", key: "consultorio", value: { nombre: "Central" } },
  );

  for (const value of [
    null,
    { id: "corto", key: "consultorio", value: {} },
    { id: "abc123def456ghi", key: "", value: {} },
    { id: "abc123def456ghi", key: "x".repeat(121), value: {} },
    { id: "abc123def456ghi", key: "consultorio" },
    { id: "abc123def456ghi", key: "consultorio", value: {}, collection: "users" },
    { id: "abc123def456ghi", key: "consultorio", value: "x".repeat(2_000_001) },
  ]) {
    assert.throws(() => normalizeLocalSystemSetting(value), /Configuración local inválida/);
  }
});
