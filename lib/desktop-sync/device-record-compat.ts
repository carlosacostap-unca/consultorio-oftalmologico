import { normalizeDeviceCode } from "./core.ts";
import type { SyncDevice } from "./types.ts";
import { normalizeDesktopUpdateChannel } from "../desktop-updates/device-policy.ts";
import { DESKTOP_UPDATE_STATUSES, type DesktopUpdateStatus } from "../desktop-updates/types.ts";

type DeviceRecord = Record<string, unknown>;

export function desktopDeviceFieldFilter(field: "device_id" | "device_key", deviceId: string) {
  const escaped = escapePocketBaseFilterValue(deviceId);
  return `${field} = "${escaped}"`;
}

export async function lookupDesktopDeviceRecord(
  deviceId: string,
  query: (field: "device_id" | "device_key", filter: string) => Promise<DeviceRecord | null>,
) {
  for (const field of ["device_id", "device_key"] as const) {
    try {
      const record = await query(field, desktopDeviceFieldFilter(field, deviceId));
      if (record) return record;
    } catch (error) {
      if (field === "device_id" && isPocketBaseBadRequest(error)) continue;
      throw error;
    }
  }
  return null;
}

export function mapDesktopDeviceRecord(record: DeviceRecord): SyncDevice {
  const deviceId = text(record.device_id) || text(record.device_key);
  const code = text(record.code) || legacyCodeFromDeviceId(deviceId);
  const enabled = typeof record.habilitado === "boolean"
    ? record.habilitado
    : record.enabled === true;

  return {
    id: text(record.id),
    deviceId,
    code,
    name: text(record.name) || text(record.nombre) || undefined,
    enabled,
    activatedBy: text(record.activated_by) || text(record.usuario_id),
    activatedAt: text(record.activated_at) || text(record.created),
    lastSeenAt: text(record.last_seen_at) || text(record.ultimo_contacto_at) || undefined,
    lastSyncAt: text(record.last_sync_at) || undefined,
    appVersion: text(record.app_version) || undefined,
    updateChannel: normalizeDesktopUpdateChannel(record.update_channel),
    updatesEnabled: record.updates_enabled === true,
    installedVersion: text(record.installed_version) || undefined,
    lastUpdateStatus: isDesktopUpdateStatus(record.last_update_status) ? record.last_update_status : undefined,
    lastUpdateAt: text(record.last_update_at) || undefined,
    lastUpdateVersion: text(record.last_update_version) || undefined,
    lastUpdateCode: text(record.last_update_code) || undefined,
  };
}

export function desktopDeviceActivationPayload(input: {
  deviceId: string;
  code: string;
  name: string;
  appVersion: string;
  actorId: string;
  now: string;
  existing?: DeviceRecord | null;
}) {
  const existing = input.existing || {};
  const activatedBy = text(existing.activated_by) || text(existing.usuario_id) || input.actorId;
  const activatedAt = text(existing.activated_at) || input.now;
  const updateChannel = existing.update_channel === "pilot" ? "pilot" : "stable";
  const updatesEnabled = existing.updates_enabled === true;
  const installedVersion = input.appVersion || text(existing.installed_version);

  return {
    device_id: input.deviceId,
    device_key: input.deviceId,
    code: input.code,
    name: input.name,
    nombre: input.name,
    enabled: true,
    habilitado: true,
    modo: text(existing.modo) || "desktop",
    activated_by: activatedBy,
    usuario_id: activatedBy,
    activated_at: activatedAt,
    last_seen_at: input.now,
    ultimo_contacto_at: input.now,
    app_version: input.appVersion,
    update_channel: updateChannel,
    updates_enabled: updatesEnabled,
    installed_version: installedVersion,
  };
}

export function desktopDeviceTouchPayload(values: { lastSeenAt?: string; lastSyncAt?: string } = {}, now = new Date().toISOString()) {
  const lastSeenAt = values.lastSeenAt || now;
  return {
    last_seen_at: lastSeenAt,
    ultimo_contacto_at: lastSeenAt,
    ...(values.lastSyncAt ? { last_sync_at: values.lastSyncAt } : {}),
  };
}

export function legacyCodeFromDeviceId(deviceId: string) {
  const prefix = deviceId.replace(/[^a-z0-9]/gi, "").slice(0, 8);
  return prefix ? normalizeDeviceCode(`PC-${prefix}`) : "";
}

function escapePocketBaseFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isDesktopUpdateStatus(value: unknown): value is DesktopUpdateStatus {
  return DESKTOP_UPDATE_STATUSES.includes(value as DesktopUpdateStatus);
}

function isPocketBaseBadRequest(error: unknown) {
  return error instanceof Error && /^PocketBase 400\b/.test(error.message);
}
