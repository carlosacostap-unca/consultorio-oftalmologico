import type { DesktopUpdateChannel, DesktopUpdateStatus } from "../desktop-updates/types";

export const SYNC_ENTITIES = ["pacientes", "consultas", "recetas"] as const;

export type SyncEntity = (typeof SYNC_ENTITIES)[number];
export type SyncOperationAction = "create" | "update" | "delete";
export type SyncOperationStatus = "pending" | "sending" | "confirmed" | "error" | "conflict";
export type SyncConflictStatus = "open" | "resolved" | "discarded";
export type SyncConflictResolution = "keep_central" | "apply_local" | "link_patient";
export type SyncConnectivity = "online" | "offline" | "checking";
export type SyncPhase = "idle" | "pushing" | "pulling" | "continuation_required" | "caught_up" | "error";

export type SyncRecord = Record<string, unknown> & {
  id?: string;
  created?: string;
  updated?: string;
  sync_deleted?: boolean;
  sync_deleted_at?: string;
  sync_deleted_by?: string;
};

export interface SyncDevice {
  id: string;
  deviceId: string;
  code: string;
  name?: string;
  enabled: boolean;
  activatedBy: string;
  activatedAt: string;
  lastSeenAt?: string;
  lastSyncAt?: string;
  appVersion?: string;
  updateChannel: DesktopUpdateChannel;
  updatesEnabled: boolean;
  installedVersion?: string;
  lastUpdateStatus?: DesktopUpdateStatus;
  lastUpdateAt?: string;
  lastUpdateVersion?: string;
  lastUpdateCode?: string;
}

export interface SyncCursor {
  entity: SyncEntity;
  updated: string;
  id: string;
}

export interface SyncOperation {
  operationId: string;
  entity: SyncEntity;
  recordId: string;
  action: SyncOperationAction;
  payload: SyncRecord;
  baseSnapshot?: SyncRecord | null;
  baseUpdated?: string | null;
  changedFields: string[];
  actorId: string;
  deviceId: string;
  localCreatedAt: string;
  status: SyncOperationStatus;
  attempts: number;
  lastError?: string | null;
  dependsOn?: string[];
}

export interface SyncOperationConfirmation {
  operationId: string;
  status: "confirmed" | "conflict" | "rejected";
  entity: SyncEntity;
  recordId: string;
  centralRecord?: SyncRecord;
  temporaryFicha?: string;
  definitiveFicha?: string;
  conflictId?: string;
  error?: string;
}

export interface SyncConflict {
  id: string;
  operationId: string;
  entity: SyncEntity;
  recordId: string;
  kind: "concurrent_update" | "possible_duplicate" | "delete_conflict" | "validation";
  baseSnapshot?: SyncRecord | null;
  localSnapshot: SyncRecord;
  centralSnapshot?: SyncRecord | null;
  conflictingFields: string[];
  actorId: string;
  deviceId: string;
  status: SyncConflictStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: SyncConflictResolution;
}

export interface SyncPushRequest {
  deviceId: string;
  operations: SyncOperation[];
}

export interface SyncPushResponse {
  confirmations: SyncOperationConfirmation[];
  serverTime: string;
}

export interface SyncPullRequest {
  deviceId: string;
  cursors: Partial<Record<SyncEntity, SyncCursor>>;
  limit?: number;
}

export interface SyncPullPage {
  entity: SyncEntity;
  records: SyncRecord[];
  cursor: SyncCursor | null;
  hasMore: boolean;
}

export interface SyncPullResponse {
  pages: SyncPullPage[];
  serverTime: string;
}

export interface SyncStatusSnapshot {
  connectivity: SyncConnectivity;
  phase: SyncPhase;
  deviceId?: string;
  deviceCode?: string;
  currentEntity?: SyncEntity;
  pagesProcessed?: number;
  recordsProcessed?: number;
  pending: number;
  errors: number;
  conflicts: number;
  running: boolean;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
}
