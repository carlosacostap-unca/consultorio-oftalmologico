import {
  DesktopSyncHttpError,
  desktopSyncErrorResponse,
  escapeFilterValue,
  requireDesktopSyncContext,
  touchDevice,
} from "@/lib/desktop-sync/server-auth";
import { SYNC_ENTITIES, type SyncCursor, type SyncEntity, type SyncPullResponse } from "@/lib/desktop-sync/types";
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

    const limit = boundedInteger(body.limit, 1, 200, 100);
    const requested = Array.isArray(body.entities)
      ? body.entities.filter((value): value is SyncEntity => SYNC_ENTITIES.includes(value as SyncEntity))
      : [...SYNC_ENTITIES];
    const cursors = isRecord(body.cursors) ? body.cursors : {};
    const pages = [];

    for (const entity of requested) {
      const cursor = parseCursor(entity, cursors[entity]);
      const params = new URLSearchParams({ page: "1", perPage: String(limit + 1), sort: "updated,id" });
      if (cursor) {
        params.set(
          "filter",
          `updated > "${escapeFilterValue(cursor.updated)}" || (updated = "${escapeFilterValue(cursor.updated)}" && id > "${escapeFilterValue(cursor.id)}")`,
        );
      }

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

function parseCursor(entity: SyncEntity, value: unknown): SyncCursor | null {
  if (!isRecord(value)) return null;
  const updated = typeof value.updated === "string" ? value.updated.trim() : "";
  const id = typeof value.id === "string" ? value.id.trim() : "";
  if (!updated || !id) return null;
  return { entity, updated, id };
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
