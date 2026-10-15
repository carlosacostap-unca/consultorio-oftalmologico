import type { SyncConflict, SyncOperation, SyncOperationConfirmation, SyncRecord } from "./types";

const LEGACY_KINDS: Record<SyncConflict["kind"], string> = {
  concurrent_update: "version_concurrente",
  possible_duplicate: "duplicado_paciente",
  delete_conflict: "version_concurrente",
  validation: "validacion",
};

export function compatibleConflictPayload(payload: SyncRecord): SyncRecord {
  const kind = payload.kind as SyncConflict["kind"];
  if (!Object.hasOwn(LEGACY_KINDS, kind)) throw new Error("Tipo de conflicto inválido.");
  return {
    ...payload,
    entidad: payload.entity,
    tipo: LEGACY_KINDS[kind],
    estado: "abierto",
    local_record_id: payload.record_id,
    central_record_id: payload.central_snapshot && typeof payload.central_snapshot === "object"
      ? (payload.central_snapshot as SyncRecord).id || "" : "",
    device_key: payload.device_id,
    asignado_a: payload.actor_id,
    local_payload: payload.local_snapshot,
    central_payload: payload.central_snapshot,
    campos: payload.conflicting_fields,
  };
}

export function compatibleConflictResolution(payload: SyncRecord): SyncRecord {
  return { ...payload, status: "resolved", estado: "resuelto" };
}

export async function persistConflictOnce(
  operation: Pick<SyncOperation, "operationId" | "entity" | "recordId" | "actorId" | "deviceId">,
  payload: SyncRecord,
  storage: {
    find: () => Promise<SyncRecord | null>;
    create: (payload: SyncRecord) => Promise<SyncRecord>;
  },
): Promise<SyncOperationConfirmation> {
  let record = await storage.find();
  if (!record) {
    try {
      record = await storage.create(compatibleConflictPayload(payload));
    } catch (error) {
      // La escritura puede haber terminado aunque se pierda su respuesta.
      record = await storage.find();
      if (!record) throw error;
    }
  }
  if (record.operation_id !== operation.operationId || record.device_id !== operation.deviceId
    || record.actor_id !== operation.actorId || record.entity !== operation.entity
    || record.record_id !== operation.recordId || !record.id) {
    throw new Error("El conflicto guardado no corresponde a esta operación.");
  }
  if (record.status !== "open") {
    throw new Error("El conflicto ya fue cerrado; se requiere revisar su confirmación durable.");
  }
  return {
    operationId: operation.operationId,
    status: "conflict",
    entity: operation.entity,
    recordId: operation.recordId,
    centralRecord: (record.central_snapshot as SyncRecord | null) || undefined,
    conflictId: String(record.id),
  };
}
