import type { SyncRecord } from "./types";

export interface DeleteResolutionMetadata {
  actorId: string;
  deviceId: string;
  operationId: string;
  centralUpdated: string;
  resolvedAt: string;
}

export function conflictCentralIsCurrent(
  conflictCentral: SyncRecord | null | undefined,
  currentCentral: SyncRecord,
): boolean {
  const expected = typeof conflictCentral?.updated === "string" ? conflictCentral.updated : "";
  return Boolean(expected && typeof currentCentral.updated === "string" && currentCentral.updated === expected);
}

export function deleteResolutionPatch(metadata: DeleteResolutionMetadata): SyncRecord {
  return {
    sync_deleted: true,
    sync_deleted_at: metadata.resolvedAt,
    sync_deleted_by: metadata.actorId,
    sync_device_id: metadata.deviceId,
    sync_operation_id: metadata.operationId,
    sync_base_updated: metadata.centralUpdated,
  };
}

export function deleteResolutionNote(resolution: "keep_central" | "apply_local"): string {
  return JSON.stringify({
    action: "delete",
    outcome: resolution === "apply_local" ? "deleted" : "kept_central",
  });
}
