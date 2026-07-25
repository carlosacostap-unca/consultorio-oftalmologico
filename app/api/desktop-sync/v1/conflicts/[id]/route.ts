import { sanitizeRecordPayload } from "@/lib/desktop-sync/server-operations";
import {
  DesktopSyncHttpError,
  assertOperationAllowed,
  desktopSyncErrorResponse,
  escapeFilterValue,
  requireDesktopSyncContext,
} from "@/lib/desktop-sync/server-auth";
import type { SyncConflictResolution, SyncEntity, SyncRecord } from "@/lib/desktop-sync/types";
import { pbAdmin } from "@/lib/pocketbase-admin";

const RECORD_ID_PATTERN = /^[a-z0-9]{15}$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, contextValue: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireDesktopSyncContext(request, { requireDevice: true });
    const { id } = await contextValue.params;
    const conflict = await pbAdmin(`/api/collections/sync_conflicts/records/${encodeURIComponent(id)}`);
    const body = (await request.json()) as Record<string, unknown>;
    const resolution = String(body.resolution || "") as SyncConflictResolution;

    if (conflict.status !== "open") throw new DesktopSyncHttpError("El conflicto ya fue resuelto", 409, "conflict_closed");
    if (!context.roles.includes("admin") && (conflict.device_id !== context.device!.deviceId || conflict.actor_id !== context.user.id)) {
      throw new DesktopSyncHttpError("No podés resolver este conflicto", 403, "conflict_forbidden");
    }
    if (!["keep_central", "apply_local", "link_patient"].includes(resolution)) {
      throw new DesktopSyncHttpError("Resolución inválida", 400, "invalid_resolution");
    }

    const entity = String(conflict.entity || "") as SyncEntity;
    let centralRecord: SyncRecord | null = conflict.central_snapshot || null;
    let linkedPatientId = "";

    if (resolution === "apply_local") {
      const current = await pbAdmin(`/api/collections/${entity}/records/${encodeURIComponent(conflict.record_id)}`);
      const conflictCentralUpdated = String(conflict.central_snapshot?.updated || "");
      if (conflictCentralUpdated && current.updated !== conflictCentralUpdated) {
        throw new DesktopSyncHttpError("La versión central volvió a cambiar; actualizá el conflicto", 409, "central_changed_again");
      }

      const local = sanitizeRecordPayload(conflict.local_snapshot || {});
      assertOperationAllowed(context, entity, "update", local);
      centralRecord = await pbAdmin(`/api/collections/${entity}/records/${encodeURIComponent(conflict.record_id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...local,
          sync_device_id: context.device!.deviceId,
          sync_operation_id: conflict.operation_id,
          sync_base_updated: current.updated || "",
        }),
      });
    }

    if (resolution === "link_patient") {
      if (entity !== "pacientes") throw new DesktopSyncHttpError("Sólo se pueden vincular conflictos de pacientes", 400, "invalid_link_entity");
      linkedPatientId = String(body.patientId || "");
      if (!RECORD_ID_PATTERN.test(linkedPatientId)) throw new DesktopSyncHttpError("Paciente central inválido", 400, "invalid_patient_id");
      const linkedRecord = await pbAdmin(`/api/collections/pacientes/records/${encodeURIComponent(linkedPatientId)}`);
      if (linkedRecord.sync_deleted === true) throw new DesktopSyncHttpError("El paciente central está eliminado", 409, "patient_deleted");
      centralRecord = linkedRecord;
    }

    const resolvedAt = new Date().toISOString();
    const updatedConflict = await pbAdmin(`/api/collections/sync_conflicts/records/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "resolved",
        resolved_at: resolvedAt,
        resolved_by: context.user.id,
        resolution,
        resolution_note: linkedPatientId ? JSON.stringify({ linkedPatientId }) : "",
      }),
    });

    await updateAppliedResult(conflict.operation_id, {
      operationId: conflict.operation_id,
      status: "confirmed",
      entity,
      recordId: linkedPatientId || conflict.record_id,
      centralRecord,
      conflictId: id,
    });

    return Response.json({ conflict: updatedConflict, centralRecord, linkedPatientId: linkedPatientId || undefined });
  } catch (error) {
    return desktopSyncErrorResponse(error);
  }
}

async function updateAppliedResult(operationId: string, result: Record<string, unknown>) {
  const filter = encodeURIComponent(`operation_id = "${escapeFilterValue(operationId)}"`);
  const applied = await pbAdmin(`/api/collections/sync_applied_operations/records?page=1&perPage=1&filter=${filter}`);
  const record = applied.items?.[0];
  if (!record) return;
  await pbAdmin(`/api/collections/sync_applied_operations/records/${encodeURIComponent(record.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "confirmed", result_json: result }),
  });
}
