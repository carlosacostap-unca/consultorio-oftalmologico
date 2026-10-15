import assert from "node:assert/strict";
import test from "node:test";
import { applyProtectedCentralRecord, persistLocalConflictBeforeStatus } from "./local-write-protection.ts";
import { processPullEntities } from "./sync-runner.ts";

test("el pull conserva registro, cola y cursor al encontrar una edición local", async () => {
  const local = { id: "patientfixture1", nombre: "Local", telefono: "nuevo" };
  const original = structuredClone(local);
  const queue = [{ operation_id: "pendingfixture01", payload: structuredClone(local), status: "error" }];
  const oldCursor = { entity: "pacientes" as const, updated: "2026-10-01", id: "oldfixture00001" };
  let durableCursor = oldCursor;
  await assert.rejects(processPullEntities(["pacientes"], 10, { pacientes: oldCursor }, async () => ({
    entity: "pacientes", records: [{ id: local.id, nombre: "Central", telefono: "viejo" }],
    cursor: { ...oldCursor, updated: "2026-10-10", id: local.id }, hasMore: false,
  }), async (entity, record) => {
    await applyProtectedCentralRecord(entity, record, undefined, {
      hasUnconfirmed: async () => queue.some((op) => op.status !== "confirmed"),
      write: async (_, record) => { Object.assign(local, record); },
    });
  }, async (cursor) => { durableCursor = cursor as typeof oldCursor; }), /Se conserva la versión local/);
  assert.deepEqual(local, original);
  assert.deepEqual(queue[0].payload, original);
  assert.deepEqual(durableCursor, oldCursor);
});

test("una confirmación histórica conserva la edición posterior y sus metadatos", async () => {
  const current = { id: "patientfixture1", telefono: "edición posterior", sync_base_updated: "base-original" };
  const before = structuredClone(current);
  const result = await applyProtectedCentralRecord("pacientes", { ...current, telefono: "histórico" }, "old-operation", {
    hasUnconfirmed: async (_, __, acknowledged) => acknowledged === "old-operation",
    write: async (_, record) => { Object.assign(current, record); },
  });
  assert.equal(result, false);
  assert.deepEqual(current, before);
});

test("la protección transaccional cubre una edición aparecida después de consultar la cola", async () => {
  const race = { response: { data: { sync_local_pending: { code: "sync_local_pending" } } } };
  const storage = { hasUnconfirmed: async () => false, write: async () => { throw race; } };
  assert.equal(await applyProtectedCentralRecord("consultas", { id: "consultfixture1" }, "confirmed-operation", storage), false);
  await assert.rejects(applyProtectedCentralRecord("consultas", { id: "consultfixture1" }, undefined, storage), (error) => error === race);
  const failure = new Error("Escritura interrumpida");
  await assert.rejects(applyProtectedCentralRecord("consultas", { id: "consultfixture1" }, "confirmed-operation", {
    ...storage, write: async () => { throw failure; },
  }), (error) => error === failure);
});

test("una falla de evidencia local no excluye la operación del reintento", async () => {
  let status = "sending";
  await assert.rejects(persistLocalConflictBeforeStatus(async () => { throw new Error("disco lleno"); }, async () => {
    status = "conflict";
  }), /disco lleno/);
  assert.equal(status, "sending");
  const order: string[] = [];
  await persistLocalConflictBeforeStatus(async () => { order.push("snapshot durable"); }, async () => { order.push("estado conflicto"); });
  assert.deepEqual(order, ["snapshot durable", "estado conflicto"]);
});
