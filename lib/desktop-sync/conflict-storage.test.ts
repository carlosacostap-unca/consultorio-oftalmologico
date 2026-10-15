import assert from "node:assert/strict";
import test from "node:test";
import { compatibleConflictPayload, compatibleConflictResolution, persistConflictOnce } from "./conflict-storage.ts";
import type { SyncConflict, SyncRecord } from "./types.ts";

const operation = { operationId: "operationfixture1", entity: "consultas" as const, recordId: "consultfixture1", actorId: "actorfixture001", deviceId: "devicefixture01" };
const payload = {
  operation_id: operation.operationId, entity: operation.entity, record_id: operation.recordId,
  actor_id: operation.actorId, device_id: operation.deviceId, kind: "concurrent_update", status: "open",
  base_snapshot: { texto: "base" }, local_snapshot: { texto: "edición local" },
  central_snapshot: { id: operation.recordId, texto: "edición central" }, conflicting_fields: ["texto"],
};

test("cada tipo actual es compatible con los select heredados conservando snapshots", () => {
  const types: [SyncConflict["kind"], string][] = [
    ["concurrent_update", "version_concurrente"], ["possible_duplicate", "duplicado_paciente"],
    ["delete_conflict", "version_concurrente"], ["validation", "validacion"],
  ];
  for (const [kind, legacyKind] of types) {
    const original = structuredClone({ ...payload, kind });
    const result = compatibleConflictPayload(original);
    assert.equal(result.tipo, legacyKind);
    assert.equal(result.kind, kind);
    assert.equal(result.entidad, "consultas");
    assert.equal(result.estado, "abierto");
    assert.deepEqual(result.local_snapshot, original.local_snapshot);
    assert.deepEqual(result.local_payload, original.local_snapshot);
    assert.deepEqual(result.central_payload, original.central_snapshot);
    assert.deepEqual(original, { ...payload, kind });
  }
});

test("respuesta perdida y reintento reutilizan el ID sin modificar versiones", async () => {
  let saved: SyncRecord | null = null;
  let writes = 0;
  const storage = {
    find: async () => saved,
    create: async (record: SyncRecord) => {
      writes++;
      saved = { id: "conflictfixture1", ...structuredClone(record) };
      throw new Error("La respuesta se perdió después de guardar");
    },
  };
  const first = await persistConflictOnce(operation, payload, storage);
  const durable = structuredClone(saved);
  const second = await persistConflictOnce(operation, { ...payload, local_snapshot: { texto: "nuevo" } }, storage);
  assert.deepEqual(second, first);
  assert.equal(writes, 1);
  assert.deepEqual(saved, durable);
});

test("conflicto cerrado o de otro actor no se reutiliza ni reabre", async () => {
  for (const difference of [{ actor_id: "anotheractor001" }, { status: "resolved" }]) {
    const saved = { id: "conflictfixture1", ...payload, ...difference };
    const before = structuredClone(saved);
    await assert.rejects(persistConflictOnce(operation, payload, {
      find: async () => saved, create: async () => { assert.fail("No debe escribir"); },
    }));
    assert.deepEqual(saved, before);
  }
});

test("resolver conserva los snapshots y alinea ambos estados", () => {
  const resolved = compatibleConflictResolution({ resolved_by: operation.actorId, resolution: "keep_central" });
  assert.deepEqual(resolved, { resolved_by: operation.actorId, resolution: "keep_central", status: "resolved", estado: "resuelto" });
  assert.equal(Object.hasOwn(resolved, "local_snapshot"), false);
  assert.equal(Object.hasOwn(resolved, "central_payload"), false);
});
