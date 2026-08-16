import "server-only";

import { deleteConflictFields, mergeDisjointPatientChanges } from "./core";
import {
  assertOperationAllowed,
  DesktopSyncHttpError,
  escapeFilterValue,
  type DesktopSyncContext,
} from "./server-auth";
import { SYNC_ENTITIES, type SyncConflict, type SyncOperation, type SyncOperationConfirmation, type SyncRecord } from "./types";
import { createConsultaEventoServer } from "@/lib/consulta-eventos-server";
import { findDuplicatePatientDocument } from "@/lib/patient-document-server";
import { getNextFichaNumber } from "@/lib/patient-ficha-server";
import { pbAdmin } from "@/lib/pocketbase-admin";

const RECORD_ID_PATTERN = /^[a-z0-9]{15}$/;
const SYSTEM_FIELDS = new Set(["id", "collectionId", "collectionName", "created", "updated", "expand"]);

export async function processSyncOperation(
  context: DesktopSyncContext,
  operation: SyncOperation,
): Promise<SyncOperationConfirmation> {
  validateOperation(context, operation);

  const applied = await findAppliedOperation(operation.operationId);
  if (applied?.result_json) return applied.result_json as SyncOperationConfirmation;

  let result: SyncOperationConfirmation;
  try {
    result = await applyOperation(context, operation);
  } catch (error) {
    if (error instanceof DesktopSyncHttpError) {
      result = rejection(operation, error.message);
    } else {
      throw error;
    }
  }

  try {
    await saveAppliedOperation(context, operation, result);
  } catch (error) {
    const concurrent = await findAppliedOperation(operation.operationId);
    if (concurrent?.result_json) return concurrent.result_json as SyncOperationConfirmation;
    throw error;
  }
  return result;
}

export function sanitizeRecordPayload(payload: SyncRecord): SyncRecord {
  const sanitized: SyncRecord = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (SYSTEM_FIELDS.has(key) || key.startsWith("sync_")) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

async function applyOperation(context: DesktopSyncContext, operation: SyncOperation): Promise<SyncOperationConfirmation> {
  const collection = operation.entity;
  const local = sanitizeRecordPayload(operation.payload);

  if (operation.action === "create") {
    assertOperationAllowed(context, operation.entity, operation.action, local);
    const existing = await findRecord(collection, operation.recordId);
    if (existing) {
      if (String(existing.sync_operation_id || "") === operation.operationId) {
        return confirmation(operation, existing);
      }
      return createConflict(context, operation, "concurrent_update", existing, ["id"]);
    }

    if (operation.entity === "pacientes") {
      const duplicate = await findPossibleDuplicatePatient(local);
      if (duplicate) return createConflict(context, operation, "possible_duplicate", duplicate, duplicate.fields);

      const temporaryFicha = String(local.numero_ficha || local.sync_ficha_provisoria || "");
      if (!local.numero_ficha || /^TEMP-/i.test(temporaryFicha)) {
        local.numero_ficha = await getNextFichaNumber();
      }
    }

    const created = await pbAdmin(`/api/collections/${collection}/records`, {
      method: "POST",
      body: JSON.stringify({
        id: operation.recordId,
        ...local,
        sync_deleted: false,
        sync_device_id: context.device!.deviceId,
        sync_operation_id: operation.operationId,
        sync_base_updated: operation.baseUpdated || "",
        ...(operation.entity === "pacientes" && /^TEMP-/i.test(String(operation.payload.numero_ficha || ""))
          ? { sync_ficha_provisoria: operation.payload.numero_ficha, sync_ficha_definitiva: local.numero_ficha }
          : {}),
      }),
    });
    await auditConsulta(context, operation, created, "created");
    return confirmation(operation, created, String(operation.payload.numero_ficha || ""));
  }

  const central = await findRecord(collection, operation.recordId);
  if (!central) throw new DesktopSyncHttpError("El registro central ya no existe", 409, "missing_central_record");
  assertOperationAllowed(context, operation.entity, operation.action, local, central);

  if (operation.action === "delete") {
    const fields = deleteConflictFields(
      operation.baseUpdated,
      typeof central.updated === "string" ? central.updated : null,
      operation.baseSnapshot,
      central,
    );
    if (fields.length > 0) {
      return createConflict(context, operation, "delete_conflict", central, fields);
    }
    const deleted = await pbAdmin(`/api/collections/${collection}/records/${operation.recordId}`, {
      method: "PATCH",
      body: JSON.stringify({
        sync_deleted: true,
        sync_deleted_at: new Date().toISOString(),
        sync_deleted_by: context.user.id,
        sync_device_id: context.device!.deviceId,
        sync_operation_id: operation.operationId,
        sync_base_updated: operation.baseUpdated || "",
      }),
    });
    await auditConsulta(context, operation, deleted, "updated");
    return confirmation(operation, deleted);
  }

  if (sameVersion(operation.baseUpdated, central.updated)) {
    const updated = await updateChangedFields(context, operation, central, local);
    await auditConsulta(context, operation, updated, "updated");
    return confirmation(operation, updated);
  }

  if (operation.entity !== "pacientes" || !operation.baseSnapshot) {
    return createConflict(context, operation, "concurrent_update", central, operation.changedFields || []);
  }

  const merge = mergeDisjointPatientChanges(operation.baseSnapshot, local, central);
  if (merge.conflicts.length > 0) {
    return createConflict(context, operation, "concurrent_update", central, merge.conflicts);
  }

  const mergedPayload: SyncRecord = {};
  for (const field of merge.localChanges) mergedPayload[field] = merge.merged[field];
  const updated = await pbAdmin(`/api/collections/pacientes/records/${operation.recordId}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...mergedPayload,
      sync_device_id: context.device!.deviceId,
      sync_operation_id: operation.operationId,
      sync_base_updated: operation.baseUpdated || "",
    }),
  });
  return confirmation(operation, updated);
}

async function updateChangedFields(
  context: DesktopSyncContext,
  operation: SyncOperation,
  central: SyncRecord,
  local: SyncRecord,
) {
  const payload: SyncRecord = {};
  for (const field of operation.changedFields || []) {
    if (SYSTEM_FIELDS.has(field) || field.startsWith("sync_")) continue;
    if (field in local) payload[field] = local[field];
  }

  if (Object.keys(payload).length === 0) {
    for (const [field, value] of Object.entries(local)) payload[field] = value;
  }

  return pbAdmin(`/api/collections/${operation.entity}/records/${operation.recordId}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...payload,
      sync_device_id: context.device!.deviceId,
      sync_operation_id: operation.operationId,
      sync_base_updated: String(central.updated || operation.baseUpdated || ""),
    }),
  });
}

async function createConflict(
  context: DesktopSyncContext,
  operation: SyncOperation,
  kind: SyncConflict["kind"],
  central: SyncRecord | null,
  fields: string[],
): Promise<SyncOperationConfirmation> {
  const detectedAt = new Date().toISOString();
  const record = await pbAdmin("/api/collections/sync_conflicts/records", {
    method: "POST",
    body: JSON.stringify({
      operation_id: operation.operationId,
      entity: operation.entity,
      record_id: operation.recordId,
      kind,
      base_snapshot: operation.baseSnapshot || null,
      local_snapshot: sanitizeRecordPayload(operation.payload),
      central_snapshot: central,
      conflicting_fields: fields,
      actor_id: context.user.id,
      device_id: context.device!.deviceId,
      status: "open",
      detected_at: detectedAt,
    }),
  });

  return {
    operationId: operation.operationId,
    status: "conflict",
    entity: operation.entity,
    recordId: operation.recordId,
    centralRecord: central || undefined,
    conflictId: record.id,
  };
}

async function findPossibleDuplicatePatient(patient: SyncRecord): Promise<(SyncRecord & { fields: string[] }) | null> {
  const document = String(patient.numero_documento || "").trim();
  if (document) {
    const duplicate = await findDuplicatePatientDocument(document, "", String(patient.tipo_documento || "DNI"));
    if (duplicate) return { ...duplicate, fields: ["numero_documento"] };
  }

  const nombre = String(patient.nombre || "").trim();
  const apellido = String(patient.apellido || "").trim();
  const fecha = String(patient.fecha_nacimiento || "").slice(0, 10);
  if (!nombre || !apellido || !fecha) return null;

  const filter = [
    `nombre ~ "${escapeFilterValue(nombre)}"`,
    `apellido ~ "${escapeFilterValue(apellido)}"`,
    `fecha_nacimiento >= "${escapeFilterValue(fecha)} 00:00:00.000Z"`,
    `fecha_nacimiento <= "${escapeFilterValue(fecha)} 23:59:59.999Z"`,
    'estado_registro != "fusionado"',
    "sync_deleted != true",
  ].join(" && ");
  const result = await pbAdmin(`/api/collections/pacientes/records?page=1&perPage=1&filter=${encodeURIComponent(filter)}`);
  return result.items?.[0] ? { ...result.items[0], fields: ["nombre", "apellido", "fecha_nacimiento"] } : null;
}

async function findRecord(collection: string, id: string): Promise<SyncRecord | null> {
  const filter = encodeURIComponent(`id = "${escapeFilterValue(id)}"`);
  const result = await pbAdmin(`/api/collections/${collection}/records?page=1&perPage=1&filter=${filter}`);
  return result.items?.[0] || null;
}

async function findAppliedOperation(operationId: string) {
  const filter = encodeURIComponent(`operation_id = "${escapeFilterValue(operationId)}"`);
  const result = await pbAdmin(`/api/collections/sync_applied_operations/records?page=1&perPage=1&filter=${filter}`);
  return result.items?.[0] || null;
}

async function saveAppliedOperation(
  context: DesktopSyncContext,
  operation: SyncOperation,
  result: SyncOperationConfirmation,
) {
  await pbAdmin("/api/collections/sync_applied_operations/records", {
    method: "POST",
    body: JSON.stringify({
      operation_id: operation.operationId,
      device_id: context.device!.deviceId,
      entity: operation.entity,
      record_id: operation.recordId,
      status: result.status,
      result_json: result,
      actor_id: context.user.id,
      applied_at: new Date().toISOString(),
    }),
  });
}

async function auditConsulta(
  context: DesktopSyncContext,
  operation: SyncOperation,
  record: SyncRecord,
  type: "created" | "updated",
) {
  if (operation.entity !== "consultas") return;
  await createConsultaEventoServer({
    consulta_id: operation.recordId,
    paciente_id: String(record.paciente_id || operation.payload.paciente_id || ""),
    tipo: type,
    titulo: type === "created" ? "Consulta creada offline" : "Consulta sincronizada desde escritorio",
    detalle: `Operación ${operation.operationId} del equipo ${context.device!.code}.`,
    actor: context.user,
    metadata: { operation_id: operation.operationId, device_id: context.device!.deviceId, origen: "desktop-sync" },
  });
}

function validateOperation(context: DesktopSyncContext, operation: SyncOperation) {
  if (!operation || typeof operation !== "object") throw new DesktopSyncHttpError("Operación inválida", 400, "invalid_operation");
  if (!/^[a-zA-Z0-9_-]{12,120}$/.test(operation.operationId || "")) {
    throw new DesktopSyncHttpError("ID de operación inválido", 400, "invalid_operation_id");
  }
  if (!SYNC_ENTITIES.includes(operation.entity)) throw new DesktopSyncHttpError("Entidad inválida", 400, "invalid_entity");
  if (!RECORD_ID_PATTERN.test(operation.recordId || "")) throw new DesktopSyncHttpError("ID de registro inválido", 400, "invalid_record_id");
  if (!["create", "update", "delete"].includes(operation.action)) throw new DesktopSyncHttpError("Acción inválida", 400, "invalid_action");
  if (operation.deviceId !== context.device!.deviceId) throw new DesktopSyncHttpError("La operación pertenece a otro equipo", 403, "device_mismatch");
  if (operation.actorId !== context.user.id) throw new DesktopSyncHttpError("La operación pertenece a otro usuario", 403, "actor_mismatch");
}

function sameVersion(base: string | null | undefined, central: unknown) {
  return Boolean(base && typeof central === "string" && base === central);
}

function confirmation(operation: SyncOperation, record: SyncRecord, temporaryFicha = ""): SyncOperationConfirmation {
  return {
    operationId: operation.operationId,
    status: "confirmed",
    entity: operation.entity,
    recordId: operation.recordId,
    centralRecord: record,
    ...(operation.entity === "pacientes" && temporaryFicha && temporaryFicha !== record.numero_ficha
      ? { temporaryFicha, definitiveFicha: String(record.numero_ficha || "") }
      : {}),
  };
}

function rejection(operation: SyncOperation, error: string): SyncOperationConfirmation {
  return { operationId: operation.operationId, status: "rejected", entity: operation.entity, recordId: operation.recordId, error };
}
