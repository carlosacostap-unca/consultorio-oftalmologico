import assert from "node:assert/strict";
import test from "node:test";
import {
  changedFields,
  conflictingFields,
  createPocketBaseId,
  createTemporaryFicha,
  isTemporaryFicha,
  mergeDisjointPatientChanges,
  normalizeDeviceCode,
  retryDelayMs,
  sanitizeSyncError,
  sortOperationsByDependencies,
} from "./core.ts";
import type { SyncOperation } from "./types.ts";

test("genera IDs compatibles con PocketBase", () => {
  const ids = new Set(Array.from({ length: 100 }, createPocketBaseId));
  assert.equal(ids.size, 100);
  for (const id of ids) assert.match(id, /^[a-z0-9]{15}$/);
});

test("normaliza equipo y genera ficha provisoria durable", () => {
  assert.equal(normalizeDeviceCode(" pc-á 1 "), "PCA1");
  assert.equal(createTemporaryFicha("PC1", 23), "TEMP-PC1-00023");
  assert.equal(isTemporaryFicha("TEMP-PC1-00023"), true);
  assert.equal(isTemporaryFicha("12345"), false);
  assert.throws(() => createTemporaryFicha("PC1", 0));
});

test("calcula campos modificados ignorando metadatos del sistema", () => {
  const base = { id: "a", nombre: "ANA", telefono: "1", updated: "old", antecedentes: ["A"] };
  const next = { id: "a", nombre: "ANA", telefono: "2", updated: "new", antecedentes: ["A"] };
  assert.deepEqual(changedFields(base, next), ["telefono"]);
});

test("fusiona cambios de paciente sobre campos distintos", () => {
  const base = { nombre: "ANA", telefono: "1", obra_social: "A" };
  const local = { ...base, telefono: "2" };
  const central = { ...base, obra_social: "B" };
  const result = mergeDisjointPatientChanges(base, local, central);

  assert.deepEqual(result.conflicts, []);
  assert.equal(result.merged.telefono, "2");
  assert.equal(result.merged.obra_social, "B");
});

test("detecta el mismo campo modificado local y centralmente", () => {
  const base = { numero_documento: "1", telefono: "1" };
  const local = { ...base, numero_documento: "2" };
  const central = { ...base, numero_documento: "3" };
  assert.deepEqual(conflictingFields(base, local, central), ["numero_documento"]);
  assert.deepEqual(mergeDisjointPatientChanges(base, local, central).conflicts, ["numero_documento"]);
});

test("ordena paciente, consulta y receta respetando dependencias explícitas", () => {
  const patient = operation("p", "pacientes", []);
  const consultation = operation("c", "consultas", ["p"]);
  const prescription = operation("r", "recetas", ["c"]);
  assert.deepEqual(sortOperationsByDependencies([prescription, consultation, patient]).map((item) => item.operationId), ["p", "c", "r"]);
});

test("reconstruye la cola pendiente y su orden después de un reinicio", () => {
  const persisted = JSON.stringify([
    operation("r-restart", "recetas", ["c-restart"]),
    operation("p-restart", "pacientes", []),
    operation("c-restart", "consultas", ["p-restart"]),
  ]);
  const restored = JSON.parse(persisted) as SyncOperation[];
  assert.deepEqual(
    sortOperationsByDependencies(restored).map((item) => item.operationId),
    ["p-restart", "c-restart", "r-restart"],
  );
});

test("rechaza ciclos de dependencias", () => {
  assert.throws(() => sortOperationsByDependencies([operation("a", "pacientes", ["b"]), operation("b", "consultas", ["a"])]));
});

test("limita backoff y sanitiza secretos", () => {
  assert.equal(retryDelayMs(0), 1_000);
  assert.equal(retryDelayMs(20), 60_000);
  const sanitized = sanitizeSyncError("Bearer abc.def token=secreto password:clave");
  assert.equal(sanitized.includes("abc.def"), false);
  assert.equal(sanitized.includes("secreto"), false);
  assert.equal(sanitized.includes("clave"), false);
});

function operation(operationId: string, entity: SyncOperation["entity"], dependsOn: string[]): SyncOperation {
  return {
    operationId,
    entity,
    recordId: operationId.padEnd(15, "0"),
    action: "create",
    payload: {},
    changedFields: [],
    actorId: "actor",
    deviceId: "device",
    localCreatedAt: "2026-07-14T12:00:00.000Z",
    status: "pending",
    attempts: 0,
    dependsOn,
  };
}
