import assert from "node:assert/strict";
import test from "node:test";
import { deriveLocalPassword, generateTemporaryLocalPassword } from "./local-password.ts";

test("deriva una credencial local estable y compatible con PocketBase", async () => {
  const first = await deriveLocalPassword("contraseña central válida", "device-1234567890");
  const second = await deriveLocalPassword("contraseña central válida", "device-1234567890");

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(first, /contraseña central válida/);
});

test("separa credenciales por equipo y contraseña", async () => {
  const baseline = await deriveLocalPassword("contraseña central válida", "device-1234567890");

  assert.notEqual(baseline, await deriveLocalPassword("otra contraseña válida", "device-1234567890"));
  assert.notEqual(baseline, await deriveLocalPassword("contraseña central válida", "device-0987654321"));
});

test("genera credenciales temporales aleatorias compatibles con bcrypt", () => {
  const first = generateTemporaryLocalPassword();
  const second = generateTemporaryLocalPassword();

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.ok(new TextEncoder().encode(first).byteLength <= 72);
  assert.notEqual(first, second);
});
