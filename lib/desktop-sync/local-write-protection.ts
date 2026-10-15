import type { SyncEntity, SyncRecord } from "./types";

export const CENTRAL_ACKNOWLEDGED_OPERATION_HEADER = "x-consultorio-acknowledged-operation";

export async function applyProtectedCentralRecord(
  entity: SyncEntity,
  record: SyncRecord,
  acknowledgedOperationId: string | undefined,
  storage: {
    hasUnconfirmed: (entity: SyncEntity, id: string, acknowledgedOperationId?: string) => Promise<boolean>;
    write: (entity: SyncEntity, record: SyncRecord, acknowledgedOperationId?: string) => Promise<void>;
  },
): Promise<boolean> {
  const id = String(record.id || "");
  if (!id) return false;
  if (await storage.hasUnconfirmed(entity, id, acknowledgedOperationId)) {
    if (acknowledgedOperationId) return false;
    throw new Error(`Se conserva la versión local de ${entity}: hay operaciones sin confirmar. Revisá los errores o conflictos antes de completar la descarga.`);
  }
  try {
    await storage.write(entity, record, acknowledgedOperationId);
  } catch (error) {
    // El hook local vuelve a comprobar la cola dentro de la transacción de escritura.
    if (acknowledgedOperationId && isLocalPendingProtection(error)) return false;
    throw error;
  }
  return true;
}

function isLocalPendingProtection(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const response = error.response as { data?: { sync_local_pending?: { code?: string } } } | undefined;
  return response?.data?.sync_local_pending?.code === "sync_local_pending";
}

export async function persistLocalConflictBeforeStatus(
  saveConflict: () => Promise<void>,
  markOperation: () => Promise<void>,
) {
  await saveConflict();
  await markOperation();
}
