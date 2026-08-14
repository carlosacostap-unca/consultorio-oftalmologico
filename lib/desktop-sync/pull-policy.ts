import { SYNC_ENTITIES, type SyncCursor, type SyncEntity } from "./types";

export const DESKTOP_PULL_DEFAULT_LIMIT = 100;
export const DESKTOP_PULL_MIN_LIMIT = 1;
export const DESKTOP_PULL_MAX_LIMIT = 200;

export function normalizePullLimit(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed)
    ? Math.min(DESKTOP_PULL_MAX_LIMIT, Math.max(DESKTOP_PULL_MIN_LIMIT, parsed))
    : DESKTOP_PULL_DEFAULT_LIMIT;
}

export function requestedPullEntities(value: unknown): SyncEntity[] {
  return Array.isArray(value)
    ? value.filter((entity): entity is SyncEntity => SYNC_ENTITIES.includes(entity as SyncEntity))
    : [...SYNC_ENTITIES];
}

export function parsePullCursor(entity: SyncEntity, value: unknown): SyncCursor | null {
  if (!isRecord(value)) return null;
  const updated = typeof value.updated === "string" ? value.updated.trim() : "";
  const id = typeof value.id === "string" ? value.id.trim() : "";
  if (!updated || !id) return null;
  return { entity, updated, id };
}

export function createPullSearchParams(
  limit: number,
  cursor: SyncCursor | null,
  escapeFilterValue: (value: string) => string,
) {
  const params = new URLSearchParams({ page: "1", perPage: String(limit + 1), sort: "updated,id" });
  if (cursor) {
    params.set(
      "filter",
      `updated > "${escapeFilterValue(cursor.updated)}" || (updated = "${escapeFilterValue(cursor.updated)}" && id > "${escapeFilterValue(cursor.id)}")`,
    );
  }
  return params;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
