import {
  DesktopSyncHttpError,
  desktopSyncErrorResponse,
  escapeFilterValue,
  requireDesktopSyncContext,
  touchDevice,
} from "@/lib/desktop-sync/server-auth";
import {
  createPullSearchParams,
  normalizePullLimit,
  parsePullCursor,
  requestedPullEntities,
} from "@/lib/desktop-sync/pull-policy";
import { type SyncPullResponse } from "@/lib/desktop-sync/types";
import { pbAdmin } from "@/lib/pocketbase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await requireDesktopSyncContext(request, { requireDevice: true });
    const body = (await request.json()) as Record<string, unknown>;
    if (String(body.deviceId || "") !== context.device!.deviceId) {
      throw new DesktopSyncHttpError("La descarga pertenece a otro equipo", 403, "device_mismatch");
    }

    const limit = normalizePullLimit(body.limit);
    const requested = requestedPullEntities(body.entities);
    const cursors = isRecord(body.cursors) ? body.cursors : {};
    const pages = [];

    for (const entity of requested) {
      const cursor = parsePullCursor(entity, cursors[entity]);
      const params = createPullSearchParams(limit, cursor, escapeFilterValue);

      const result = await pbAdmin(`/api/collections/${entity}/records?${params}`);
      const allItems = Array.isArray(result.items) ? result.items : [];
      const hasMore = allItems.length > limit;
      const records = hasMore ? allItems.slice(0, limit) : allItems;
      const last = records.at(-1);

      pages.push({
        entity,
        records,
        cursor: last ? { entity, updated: String(last.updated || ""), id: String(last.id || "") } : cursor,
        hasMore,
      });
    }

    const serverTime = new Date().toISOString();
    await touchDevice(context.device!.id, { lastSyncAt: serverTime });
    const response: SyncPullResponse = { pages, serverTime };
    return Response.json(response);
  } catch (error) {
    return desktopSyncErrorResponse(error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
