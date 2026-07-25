import { sortOperationsByDependencies } from "@/lib/desktop-sync/core";
import { processSyncOperation } from "@/lib/desktop-sync/server-operations";
import {
  DesktopSyncHttpError,
  desktopSyncErrorResponse,
  requireDesktopSyncContext,
  touchDevice,
} from "@/lib/desktop-sync/server-auth";
import type { SyncOperation, SyncPushRequest, SyncPushResponse } from "@/lib/desktop-sync/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await requireDesktopSyncContext(request, { requireDevice: true });
    const body = (await request.json()) as SyncPushRequest;
    const operations = Array.isArray(body.operations) ? body.operations : [];

    if (body.deviceId !== context.device!.deviceId) {
      throw new DesktopSyncHttpError("El lote pertenece a otro equipo", 403, "device_mismatch");
    }
    if (operations.length === 0 || operations.length > 50) {
      throw new DesktopSyncHttpError("El lote debe contener entre 1 y 50 operaciones", 400, "invalid_batch_size");
    }

    let ordered: SyncOperation[];
    try {
      ordered = sortOperationsByDependencies(operations);
    } catch (error) {
      throw new DesktopSyncHttpError(error instanceof Error ? error.message : "Dependencias inválidas", 400, "invalid_dependencies");
    }

    const confirmations = [];
    for (const operation of ordered) confirmations.push(await processSyncOperation(context, operation));

    const serverTime = new Date().toISOString();
    await touchDevice(context.device!.id, { lastSyncAt: serverTime });
    const response: SyncPushResponse = { confirmations, serverTime };
    return Response.json(response);
  } catch (error) {
    return desktopSyncErrorResponse(error);
  }
}
