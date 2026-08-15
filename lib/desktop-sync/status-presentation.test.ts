import assert from "node:assert/strict";
import test from "node:test";
import { presentSyncStatus } from "./status-presentation.ts";
import type { SyncStatusSnapshot } from "./types.ts";

test("presenta una continuación extensa como progreso y no como error", () => {
  const result = presentSyncStatus(status({
    phase: "continuation_required",
    running: true,
    currentEntity: "consultas",
    recordsProcessed: 20_000,
  }));

  assert.equal(result.active, true);
  assert.equal(result.label, "Descargando consultas");
  assert.match(result.detail, /20[.]000 registros/);
  assert.match(result.detail, /continuará automáticamente/);
  assert.equal(result.tone, "blue");
});

test("presenta la copia al día solamente en caught_up", () => {
  const result = presentSyncStatus(status({ phase: "caught_up", connectivity: "online" }));
  assert.equal(result.active, false);
  assert.equal(result.label, "Sincronizado");
  assert.match(result.detail, /copia local está actualizada/);
});

test("presenta un cursor inválido como sincronización detenida", () => {
  const result = presentSyncStatus(status({ phase: "error", lastError: "El cursor de consultas no avanzó." }));
  assert.equal(result.active, false);
  assert.equal(result.label, "Sincronización detenida");
  assert.match(result.detail, /no avanzó/);
  assert.equal(result.tone, "amber");
});

function status(overrides: Partial<SyncStatusSnapshot>): SyncStatusSnapshot {
  return {
    connectivity: "checking",
    phase: "idle",
    pending: 0,
    errors: 0,
    conflicts: 0,
    running: false,
    ...overrides,
  };
}
