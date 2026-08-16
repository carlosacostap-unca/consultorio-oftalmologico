import assert from "node:assert/strict";
import test from "node:test";
import {
  conflictCentralIsCurrent,
  deleteResolutionNote,
  deleteResolutionPatch,
} from "./conflict-policy.ts";

test("rechaza resolver una baja si la revisión central volvió a cambiar", () => {
  assert.equal(conflictCentralIsCurrent(
    { updated: "2026-08-16T10:00:00.000Z" },
    { updated: "2026-08-16T10:01:00.000Z" },
  ), false);
  assert.equal(conflictCentralIsCurrent(
    { updated: "2026-08-16T10:00:00.000Z" },
    { updated: "2026-08-16T10:00:00.000Z" },
  ), true);
});

test("la confirmación de una baja conserva actor, equipo, operación y revisión central", () => {
  assert.deepEqual(deleteResolutionPatch({
    actorId: "doctor-a",
    deviceId: "device-a",
    operationId: "operation-delete-a",
    centralUpdated: "2026-08-16T10:00:00.000Z",
    resolvedAt: "2026-08-16T10:05:00.000Z",
  }), {
    sync_deleted: true,
    sync_deleted_at: "2026-08-16T10:05:00.000Z",
    sync_deleted_by: "doctor-a",
    sync_device_id: "device-a",
    sync_operation_id: "operation-delete-a",
    sync_base_updated: "2026-08-16T10:00:00.000Z",
  });
});

test("la auditoría distingue confirmar y cancelar la baja", () => {
  assert.deepEqual(JSON.parse(deleteResolutionNote("apply_local")), { action: "delete", outcome: "deleted" });
  assert.deepEqual(JSON.parse(deleteResolutionNote("keep_central")), { action: "delete", outcome: "kept_central" });
});
