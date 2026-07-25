import "server-only";

import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";
import { normalizeUserRoles, type UserRole } from "@/lib/permissions";
import type { SyncDevice, SyncEntity, SyncOperationAction } from "./types";

export const DESKTOP_DEVICE_HEADER = "x-consultorio-device-id";

export interface DesktopSyncUser extends Record<string, unknown> {
  id: string;
  email?: string;
  name?: string;
  role?: UserRole;
  roles?: UserRole[];
}

export interface DesktopSyncContext {
  user: DesktopSyncUser;
  roles: UserRole[];
  device: SyncDevice | null;
}

export class DesktopSyncHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

export async function requireDesktopSyncContext(
  request: Request,
  options: { requireDevice?: boolean } = {},
): Promise<DesktopSyncContext> {
  if (!desktopSyncEnabled()) {
    throw new DesktopSyncHttpError("La sincronización de escritorio no está habilitada", 503, "sync_disabled");
  }

  const record = await authenticatedUser(request);
  if (!record?.id) throw new DesktopSyncHttpError("Sesión central inválida", 401, "invalid_session");

  const user = record as DesktopSyncUser;
  const roles = normalizeUserRoles(user);
  if (roles.length === 0) throw new DesktopSyncHttpError("La cuenta no tiene un rol operativo", 403, "missing_role");

  const deviceId = request.headers.get(DESKTOP_DEVICE_HEADER)?.trim() || "";
  if (!options.requireDevice && !deviceId) return { user, roles, device: null };
  if (!deviceId) throw new DesktopSyncHttpError("Falta la identidad del equipo", 400, "missing_device");

  const device = await findDeviceByKey(deviceId);
  if (!device) throw new DesktopSyncHttpError("El equipo no está activado", 403, "unknown_device");
  if (device.enabled !== true) throw new DesktopSyncHttpError("El equipo está deshabilitado", 403, "disabled_device");

  return { user, roles, device };
}

export function assertOperationAllowed(
  context: DesktopSyncContext,
  entity: SyncEntity,
  action: SyncOperationAction,
  payload: Record<string, unknown>,
) {
  const { roles, user } = context;
  const isAdmin = roles.includes("admin");
  const isDoctor = roles.includes("medico");
  const isSecretary = roles.includes("secretaria");

  if (entity === "pacientes") {
    if (isAdmin || isDoctor || isSecretary) return;
  } else if (entity === "consultas" || entity === "recetas") {
    if ((action === "create" || action === "update") && isDoctor && String(payload.medico_id || "") === user.id) return;
    if (action === "delete" && (isAdmin || isDoctor)) return;
  }

  throw new DesktopSyncHttpError("La cuenta no puede realizar esta operación", 403, "operation_forbidden");
}

export function desktopSyncErrorResponse(error: unknown) {
  if (error instanceof DesktopSyncHttpError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }

  console.error("Error de sincronización de escritorio:", error);
  return Response.json({ error: "No se pudo completar la operación de sincronización", code: "internal_error" }, { status: 500 });
}

export function desktopSyncEnabled() {
  return process.env.DESKTOP_SYNC_ENABLED === "true" || process.env.NODE_ENV === "test";
}

export async function findDeviceByKey(deviceId: string): Promise<SyncDevice | null> {
  const filter = encodeURIComponent(`device_id = "${escapeFilterValue(deviceId)}"`);
  const result = await pbAdmin(`/api/collections/sync_devices/records?page=1&perPage=1&filter=${filter}`);
  const item = result.items?.[0];
  return item ? mapDevice(item) : null;
}

export async function touchDevice(deviceRecordId: string, values: { lastSeenAt?: string; lastSyncAt?: string } = {}) {
  const now = new Date().toISOString();
  await pbAdmin(`/api/collections/sync_devices/records/${encodeURIComponent(deviceRecordId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      last_seen_at: values.lastSeenAt || now,
      ...(values.lastSyncAt ? { last_sync_at: values.lastSyncAt } : {}),
    }),
  });
}

export function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function mapDevice(record: Record<string, unknown>): SyncDevice {
  return {
    id: String(record.id || ""),
    deviceId: String(record.device_id || ""),
    code: String(record.code || ""),
    name: typeof record.name === "string" ? record.name : undefined,
    enabled: record.enabled === true,
    activatedBy: String(record.activated_by || ""),
    activatedAt: String(record.activated_at || record.created || ""),
    lastSeenAt: typeof record.last_seen_at === "string" ? record.last_seen_at : undefined,
    lastSyncAt: typeof record.last_sync_at === "string" ? record.last_sync_at : undefined,
    appVersion: typeof record.app_version === "string" ? record.app_version : undefined,
  };
}
