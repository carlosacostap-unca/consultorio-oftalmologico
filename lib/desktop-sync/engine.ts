"use client";

import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import { retryDelayMs, sanitizeSyncError, sortOperationsByDependencies } from "./core";
import { desktopCentralRequest, loadDesktopActivation } from "./client";
import { createSingleFlightRunner, processInBatches } from "./sync-runner";
import type {
  SyncCursor,
  SyncEntity,
  SyncOperation,
  SyncOperationConfirmation,
  SyncPullResponse,
  SyncPushResponse,
  SyncRecord,
  SyncStatusSnapshot,
  SyncConflictResolution,
} from "./types";

export const DESKTOP_SYNC_STATUS_EVENT = "consultorio:desktop-sync-status";
let syncRunning = false;
let maintenanceRequested = false;
let activeSyncPromise: Promise<SyncStatusSnapshot> | null = null;
const executeSingleFlight = createSingleFlightRunner(async () => {
  syncRunning = true;
  try {
    return await executeSync();
  } finally {
    syncRunning = false;
  }
});

export function runDesktopSync(): Promise<SyncStatusSnapshot> {
  if (maintenanceRequested) return getDesktopSyncStatus();
  const promise = executeSingleFlight();
  activeSyncPromise = promise;
  void promise.finally(() => {
    if (activeSyncPromise === promise) activeSyncPromise = null;
  });
  return promise;
}

export async function prepareDesktopSyncForMaintenance(): Promise<SyncStatusSnapshot> {
  maintenanceRequested = true;
  if (activeSyncPromise) await activeSyncPromise;
  return getDesktopSyncStatus();
}

export function releaseDesktopSyncMaintenance() {
  maintenanceRequested = false;
}

export async function getDesktopSyncStatus(): Promise<SyncStatusSnapshot> {
  if (!window.consultorioDesktop || !pb.authStore.isValid) return emptyStatus();
  const operations = await pb.collection("sync_operations").getFullList({ fields: "status", requestKey: null });
  const conflicts = await pb.collection("sync_local_conflicts").getFullList({ filter: 'status = "open"', fields: "id", requestKey: null });
  const stored = await findOne("sync_runtime_state", 'key = "sync-status"');
  const value = (stored?.value || {}) as Partial<SyncStatusSnapshot>;
  return {
    ...emptyStatus(),
    ...value,
    connectivity: navigator.onLine ? value.connectivity || "checking" : "offline",
    pending: operations.filter((item) => item.status === "pending" || item.status === "sending").length,
    errors: operations.filter((item) => item.status === "error").length,
    conflicts: conflicts.length,
    running: syncRunning,
  };
}

export async function resolveDesktopConflict(
  conflict: RecordModel,
  resolution: SyncConflictResolution,
  patientId = "",
) {
  const activation = await loadDesktopActivation();
  if (!activation?.bootstrapCompleted) throw new Error("El equipo no está activado.");
  const body = await desktopCentralRequest(
    activation.centralAppUrl,
    `/api/desktop-sync/v1/conflicts/${String(conflict.conflict_id)}`,
    { resolution, ...(patientId ? { patientId } : {}) },
  );
  const entity = conflict.entity as SyncEntity;
  const centralRecord = body.centralRecord as SyncRecord | null;
  const linkedPatientId = String(body.linkedPatientId || "");

  if (linkedPatientId && entity === "pacientes") {
    if (centralRecord) await upsertCentralRecord("pacientes", centralRecord);
    await relinkLocalPatient(String(conflict.record_id), linkedPatientId);
  } else if (centralRecord) {
    await upsertCentralRecord(entity, centralRecord);
  }

  await pb.collection("sync_local_conflicts").update(conflict.id, { status: "resolved" }, { requestKey: null });
  const operation = await findOne("sync_operations", `operation_id = "${escapeFilter(String(conflict.operation_id))}"`);
  if (operation) await pb.collection("sync_operations").update(operation.id, { status: "confirmed", last_error: "" }, { requestKey: null });
  return body;
}

async function executeSync(): Promise<SyncStatusSnapshot> {
  if (!window.consultorioDesktop || !pb.authStore.isValid) return emptyStatus();
  const activation = await loadDesktopActivation();
  if (!activation?.bootstrapCompleted) return emptyStatus();
  const startedAt = new Date().toISOString();
  await publishStatus({ ...(await getDesktopSyncStatus()), running: true, connectivity: navigator.onLine ? "checking" : "offline", lastAttemptAt: startedAt });

  try {
    if (!navigator.onLine) throw new Error("Sin conexión al servidor central.");
    await pushPendingOperations(activation.centralAppUrl, window.consultorioDesktop.runtime.deviceId);
    await pullCentralChanges(activation.centralAppUrl, window.consultorioDesktop.runtime.deviceId);
    return publishStatus({
      ...(await getDesktopSyncStatus()),
      running: false,
      connectivity: "online",
      lastAttemptAt: startedAt,
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    });
  } catch (error) {
    await resetSendingOperations(error);
    return publishStatus({
      ...(await getDesktopSyncStatus()),
      running: false,
      connectivity: "offline",
      lastAttemptAt: startedAt,
      lastError: sanitizeSyncError(error),
    });
  }
}

async function pushPendingOperations(centralAppUrl: string, deviceId: string) {
  const records = await pb.collection("sync_operations").getFullList({
    filter: 'status = "pending" || status = "error"',
    sort: "queued_at,id",
    requestKey: null,
  });
  const now = Date.now();
  const eligible = records.filter((item) => !item.next_attempt_at || new Date(item.next_attempt_at).getTime() <= now);
  const operations = sortOperationsByDependencies(eligible.map(mapLocalOperation)) as LocalSyncOperation[];

  await processInBatches(
    operations,
    25,
    async (batch) => {
      for (const operation of batch) {
        await pb.collection("sync_operations").update(operation.localQueueId, { status: "sending", last_error: "" }, { requestKey: null });
      }
      return (await desktopCentralRequest(centralAppUrl, "/api/desktop-sync/v1/push", {
        deviceId,
        operations: batch.map(toSyncOperation),
      })) as unknown as SyncPushResponse;
    },
    async (body, batch) => {
      for (const confirmation of body.confirmations || []) await applyConfirmation(confirmation, batch);
    },
    async (error) => { await resetSendingOperations(error); },
  );
}

async function applyConfirmation(confirmation: SyncOperationConfirmation, batch: LocalSyncOperation[]) {
  const operation = batch.find((item) => item.operationId === confirmation.operationId);
  if (!operation) return;

  if (confirmation.status === "confirmed") {
    if (confirmation.centralRecord) await upsertCentralRecord(confirmation.entity, confirmation.centralRecord);
    await pb.collection("sync_operations").update(operation.localQueueId, { status: "confirmed", last_error: "" }, { requestKey: null });
    return;
  }

  if (confirmation.status === "conflict") {
    await pb.collection("sync_operations").update(operation.localQueueId, { status: "conflict", last_error: "Conflicto pendiente de resolución" }, { requestKey: null });
    await upsertLocalConflict(confirmation, operation);
    return;
  }

  const attempts = operation.attempts + 1;
  await pb.collection("sync_operations").update(operation.localQueueId, {
    status: "error",
    attempts,
    next_attempt_at: new Date(Date.now() + retryDelayMs(attempts)).toISOString(),
    last_error: sanitizeSyncError(confirmation.error || "Operación rechazada"),
  }, { requestKey: null });
}

async function pullCentralChanges(centralAppUrl: string, deviceId: string) {
  const cursors = await loadCursors();
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const body = (await desktopCentralRequest(centralAppUrl, "/api/desktop-sync/v1/pull", {
      deviceId,
      entities: ["pacientes", "consultas", "recetas"],
      cursors,
      limit: 100,
    })) as unknown as SyncPullResponse;
    let hasMore = false;
    for (const page of body.pages || []) {
      for (const record of page.records) await upsertCentralRecord(page.entity, record);
      if (page.cursor) {
        cursors[page.entity] = page.cursor;
        await saveCursor(page.cursor);
      }
      hasMore ||= page.hasMore;
    }
    if (!hasMore) return;
  }
  throw new Error("La descarga incremental excedió el límite seguro de páginas.");
}

async function upsertCentralRecord(entity: SyncEntity, record: SyncRecord) {
  const id = String(record.id || "");
  if (!id) return;
  const payload = sanitizeLocalPayload(record);
  const options = { headers: { "x-consultorio-sync-origin": "central" }, requestKey: null };
  try {
    await pb.collection(entity).getOne(id, { requestKey: null });
    await pb.collection(entity).update(id, payload, options);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await pb.collection(entity).create({ id, ...payload }, options);
  }
}

async function relinkLocalPatient(localPatientId: string, centralPatientId: string) {
  const options = { headers: { "x-consultorio-sync-origin": "central" }, requestKey: null };
  for (const entity of ["consultas", "recetas"] as const) {
    const records = await pb.collection(entity).getFullList({ filter: `paciente_id = "${escapeFilter(localPatientId)}"`, requestKey: null });
    for (const record of records) await pb.collection(entity).update(record.id, { paciente_id: centralPatientId }, options);
  }

  const queued = await pb.collection("sync_operations").getFullList({
    filter: '(status = "pending" || status = "error") && (entity = "consultas" || entity = "recetas")',
    requestKey: null,
  });
  for (const operation of queued) {
    const payload = (operation.payload || {}) as Record<string, unknown>;
    if (String(payload.paciente_id || "") !== localPatientId) continue;
    await pb.collection("sync_operations").update(operation.id, { payload: { ...payload, paciente_id: centralPatientId } }, { requestKey: null });
  }

  await pb.collection("pacientes").update(localPatientId, {
    sync_deleted: true,
    sync_deleted_at: new Date().toISOString(),
  }, options).catch((error) => {
    if (!isNotFound(error)) throw error;
  });
}

async function upsertLocalConflict(confirmation: SyncOperationConfirmation, operation: LocalSyncOperation) {
  const conflictId = confirmation.conflictId || operation.operationId;
  const existing = await findOne("sync_local_conflicts", `conflict_id = "${escapeFilter(conflictId)}"`);
  const payload = {
    conflict_id: conflictId,
    operation_id: operation.operationId,
    entity: operation.entity,
    record_id: operation.recordId,
    local_snapshot: operation.payload,
    central_snapshot: confirmation.centralRecord || {},
    status: "open",
  };
  if (existing) await pb.collection("sync_local_conflicts").update(existing.id, payload, { requestKey: null });
  else await pb.collection("sync_local_conflicts").create(payload, { requestKey: null });
}

async function resetSendingOperations(error: unknown) {
  if (!pb.authStore.isValid) return;
  const sending = await pb.collection("sync_operations").getFullList({ filter: 'status = "sending"', requestKey: null }).catch(() => []);
  for (const item of sending) {
    const attempts = Number(item.attempts || 0) + 1;
    await pb.collection("sync_operations").update(item.id, {
      status: "error",
      attempts,
      next_attempt_at: new Date(Date.now() + retryDelayMs(attempts)).toISOString(),
      last_error: sanitizeSyncError(error),
    }, { requestKey: null }).catch(() => undefined);
  }
}

async function loadCursors() {
  const result: Partial<Record<SyncEntity, SyncCursor>> = {};
  const records = await pb.collection("sync_cursors").getFullList({ requestKey: null });
  for (const item of records) {
    if (!["pacientes", "consultas", "recetas"].includes(String(item.collection))) continue;
    if (item.updated && item.record_id) {
      const entity = item.collection as SyncEntity;
      result[entity] = { entity, updated: String(item.updated), id: String(item.record_id) };
    }
  }
  return result;
}

async function saveCursor(cursor: SyncCursor) {
  const existing = await findOne("sync_cursors", `collection = "${cursor.entity}"`);
  const payload = { collection: cursor.entity, updated: cursor.updated, record_id: cursor.id };
  if (existing) await pb.collection("sync_cursors").update(existing.id, payload, { requestKey: null });
  else await pb.collection("sync_cursors").create(payload, { requestKey: null });
}

async function publishStatus(status: SyncStatusSnapshot): Promise<SyncStatusSnapshot> {
  const existing = await findOne("sync_runtime_state", 'key = "sync-status"').catch(() => null);
  const payload = { key: "sync-status", value: status };
  if (existing) await pb.collection("sync_runtime_state").update(existing.id, payload, { requestKey: null });
  else if (pb.authStore.isValid) await pb.collection("sync_runtime_state").create(payload, { requestKey: null });
  window.dispatchEvent(new CustomEvent(DESKTOP_SYNC_STATUS_EVENT, { detail: status }));
  return status;
}

interface LocalSyncOperation extends SyncOperation {
  localQueueId: string;
}

function toSyncOperation(operation: LocalSyncOperation): SyncOperation {
  return {
    operationId: operation.operationId,
    entity: operation.entity,
    recordId: operation.recordId,
    action: operation.action,
    payload: operation.payload,
    baseSnapshot: operation.baseSnapshot,
    baseUpdated: operation.baseUpdated,
    changedFields: operation.changedFields,
    actorId: operation.actorId,
    deviceId: operation.deviceId,
    localCreatedAt: operation.localCreatedAt,
    status: operation.status,
    attempts: operation.attempts,
    lastError: operation.lastError,
    dependsOn: operation.dependsOn,
  };
}

function mapLocalOperation(record: RecordModel): LocalSyncOperation {
  const baseSnapshot = (record.base_snapshot || null) as SyncRecord | null;
  return {
    localQueueId: record.id,
    operationId: String(record.operation_id),
    entity: record.entity as SyncEntity,
    recordId: String(record.record_id),
    action: record.action,
    payload: (record.payload || {}) as SyncRecord,
    baseSnapshot,
    baseUpdated: typeof baseSnapshot?.updated === "string" ? baseSnapshot.updated : null,
    changedFields: Array.isArray(record.changed_fields) ? record.changed_fields.map(String) : [],
    actorId: String(record.actor_id),
    deviceId: String(record.device_id),
    localCreatedAt: String(record.queued_at || record.created || new Date().toISOString()),
    status: record.status,
    attempts: Number(record.attempts || 0),
    lastError: record.last_error ? String(record.last_error) : null,
    dependsOn: Array.isArray(record.dependencies) ? record.dependencies.map(String) : [],
  };
}

function sanitizeLocalPayload(record: SyncRecord) {
  const payload = { ...record };
  for (const field of ["id", "collectionId", "collectionName", "created", "updated", "expand"]) delete payload[field];
  return payload;
}

async function findOne(collection: string, filter: string): Promise<RecordModel | null> {
  try {
    return await pb.collection(collection).getFirstListItem(filter, { requestKey: null });
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

function isNotFound(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 404);
}

function escapeFilter(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function emptyStatus(): SyncStatusSnapshot {
  return { connectivity: navigator.onLine ? "checking" : "offline", pending: 0, errors: 0, conflicts: 0, running: false };
}
