import type { SyncEntity, SyncOperationStatus } from "./desktop-sync/types";

export type VisibleSyncRecordStatus = "pending" | "error" | "conflict";
export type SyncRecordStatusMap = Record<string, VisibleSyncRecordStatus>;

export interface SyncOperationStatusRecord {
  entity?: unknown;
  record_id?: unknown;
  status?: unknown;
}

const STATUS_PRIORITY: Record<VisibleSyncRecordStatus, number> = {
  pending: 1,
  error: 2,
  conflict: 3,
};

export function syncRecordStatusKey(entity: SyncEntity, recordId: string): string {
  return `${entity}:${recordId}`;
}

export function buildSyncRecordStatusMap(records: readonly SyncOperationStatusRecord[]): SyncRecordStatusMap {
  const result: SyncRecordStatusMap = {};

  for (const record of records) {
    const entity = normalizeEntity(record.entity);
    const recordId = String(record.record_id || "").trim();
    const status = normalizeVisibleStatus(record.status);
    if (!entity || !recordId || !status) continue;

    const key = syncRecordStatusKey(entity, recordId);
    const current = result[key];
    if (!current || STATUS_PRIORITY[status] > STATUS_PRIORITY[current]) result[key] = status;
  }

  return result;
}

export function getSyncRecordStatus(
  statuses: SyncRecordStatusMap,
  entity: SyncEntity,
  recordId: string | null | undefined,
): VisibleSyncRecordStatus | undefined {
  return recordId ? statuses[syncRecordStatusKey(entity, recordId)] : undefined;
}

function normalizeEntity(value: unknown): SyncEntity | null {
  return value === "pacientes" || value === "consultas" || value === "recetas" ? value : null;
}

function normalizeVisibleStatus(value: unknown): VisibleSyncRecordStatus | null {
  const status = value as SyncOperationStatus;
  if (status === "pending" || status === "sending") return "pending";
  if (status === "error" || status === "conflict") return status;
  return null;
}
