import assert from "node:assert/strict";
import test from "node:test";
import { assertDesktopPostUpdateHealth } from "./update-recovery.mjs";

const healthy = { pocketBaseHealthy: true, nextHealthy: true, migrationsHealthy: true, identityPreserved: true };

test("acepta el primer inicio sólo con servicios, migraciones e identidad saludables", () => {
  assert.equal(assertDesktopPostUpdateHealth(healthy), true);
});

test("rechaza una migración fallida antes de exponer la interfaz clínica", () => {
  assert.throws(() => assertDesktopPostUpdateHealth({ ...healthy, migrationsHealthy: false }), /migraciones locales/);
});

test("rechaza servicios fallidos o una identidad reemplazada", () => {
  assert.throws(() => assertDesktopPostUpdateHealth({ ...healthy, pocketBaseHealthy: false }), /PocketBase/);
  assert.throws(() => assertDesktopPostUpdateHealth({ ...healthy, nextHealthy: false }), /interfaz local/);
  assert.throws(() => assertDesktopPostUpdateHealth({ ...healthy, identityPreserved: false }), /identidad/);
});
