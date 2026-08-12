import "server-only";

import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  MANAGED_ROLES,
  effectivePermissionsForRoles,
  normalizeUserRoles,
  type PermissionKey,
  type UserRole,
} from "@/lib/permissions";
import { desktopDeviceAccess, isDesktopOperationAllowed } from "./server-auth-policy";
import { normalizeDesktopUpdateChannel } from "../desktop-updates/device-policy";
import { DESKTOP_UPDATE_STATUSES, type DesktopUpdateStatus } from "../desktop-updates/types";
import type { SyncDevice, SyncEntity, SyncOperationAction, SyncRecord } from "./types";

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
  permissions: PermissionKey[];
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
  const permissions = await loadDesktopPermissions(roles);

  const deviceId = request.headers.get(DESKTOP_DEVICE_HEADER)?.trim() || "";
  const deviceAccess = desktopDeviceAccess(options.requireDevice, deviceId);
  if (deviceAccess === "skip") return { user, roles, permissions, device: null };
  if (deviceAccess === "missing") throw new DesktopSyncHttpError("Falta la identidad del equipo", 400, "missing_device");

  const device = await findDeviceByKey(deviceId);
  if (!device) throw new DesktopSyncHttpError("El equipo no está activado", 403, "unknown_device");
  if (device.enabled !== true) throw new DesktopSyncHttpError("El equipo está deshabilitado", 403, "disabled_device");

  return { user, roles, permissions, device };
}

export function assertOperationAllowed(
  context: DesktopSyncContext,
  entity: SyncEntity,
  action: SyncOperationAction,
  payload: SyncRecord,
  centralRecord?: SyncRecord | null,
) {
  if (isDesktopOperationAllowed({
    roles: context.roles,
    permissions: context.permissions,
    userId: context.user.id,
    entity,
    action,
    payload,
    centralRecord,
  })) return;

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

async function loadDesktopPermissions(roles: UserRole[]) {
  if (roles.includes("admin")) return [...ALL_PERMISSION_KEYS];

  const result = await pbAdmin("/api/collections/role_permissions/records?page=1&perPage=50&sort=role");
  const records = Array.isArray(result.items) ? result.items : [];
  const rolePermissions: Partial<Record<(typeof MANAGED_ROLES)[number], PermissionKey[]>> = {};

  for (const role of MANAGED_ROLES) {
    const record = records.find((item: Record<string, unknown>) => item.role === role);
    rolePermissions[role] = record
      ? sanitizePermissions(record.permissions)
      : DEFAULT_ROLE_PERMISSIONS[role];
  }

  return effectivePermissionsForRoles(roles, rolePermissions);
}

function sanitizePermissions(value: unknown): PermissionKey[] {
  if (!Array.isArray(value)) return [];
  return value.filter((permission): permission is PermissionKey =>
    ALL_PERMISSION_KEYS.includes(permission as PermissionKey)
  );
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
    updateChannel: normalizeDesktopUpdateChannel(record.update_channel),
    updatesEnabled: record.updates_enabled === true,
    installedVersion: typeof record.installed_version === "string" ? record.installed_version : undefined,
    lastUpdateStatus: isDesktopUpdateStatus(record.last_update_status) ? record.last_update_status : undefined,
    lastUpdateAt: typeof record.last_update_at === "string" ? record.last_update_at : undefined,
    lastUpdateVersion: typeof record.last_update_version === "string" ? record.last_update_version : undefined,
    lastUpdateCode: typeof record.last_update_code === "string" ? record.last_update_code : undefined,
  };
}

function isDesktopUpdateStatus(value: unknown): value is DesktopUpdateStatus {
  return DESKTOP_UPDATE_STATUSES.includes(value as DesktopUpdateStatus);
}
