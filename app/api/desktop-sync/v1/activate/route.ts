import { normalizeDeviceCode } from "@/lib/desktop-sync/core";
import {
  DesktopSyncHttpError,
  desktopSyncErrorResponse,
  escapeFilterValue,
  requireDesktopSyncContext,
} from "@/lib/desktop-sync/server-auth";
import { canActivateDesktopDevice } from "@/lib/desktop-sync/server-auth-policy";
import { pbAdmin } from "@/lib/pocketbase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await requireDesktopSyncContext(request);
    const body = (await request.json()) as Record<string, unknown>;
    const deviceId = String(body.deviceId || "").trim();
    const code = normalizeDeviceCode(String(body.code || ""));
    const name = String(body.name || code).trim().slice(0, 120);
    const appVersion = String(body.appVersion || "").trim().slice(0, 40);

    if (!/^[a-z0-9-]{16,80}$/i.test(deviceId)) {
      return Response.json({ error: "Identidad de equipo inválida", code: "invalid_device_id" }, { status: 400 });
    }

    const filter = encodeURIComponent(`device_id = "${escapeFilterValue(deviceId)}"`);
    const existingResult = await pbAdmin(`/api/collections/sync_devices/records?page=1&perPage=1&filter=${filter}`);
    const existing = existingResult.items?.[0];

    if (!canActivateDesktopDevice(context.roles, Boolean(existing))) {
      throw new DesktopSyncHttpError(
        "Sólo un administrador puede registrar un equipo nuevo",
        403,
        "device_enrollment_forbidden",
      );
    }

    if (existing && existing.enabled !== true) {
      return Response.json({ error: "El equipo está deshabilitado", code: "disabled_device" }, { status: 403 });
    }
    if (existing && String(existing.code || "") !== code) {
      return Response.json({ error: "El código del equipo activado no puede cambiar", code: "immutable_device_code" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const payload = {
      device_id: deviceId,
      code,
      name,
      enabled: true,
      activated_by: existing?.activated_by || context.user.id,
      activated_at: existing?.activated_at || now,
      last_seen_at: now,
      app_version: appVersion,
      update_channel: existing?.update_channel === "pilot" ? "pilot" : "stable",
      updates_enabled: existing?.updates_enabled === true,
      installed_version: appVersion || existing?.installed_version || "",
    };
    const record = existing
      ? await pbAdmin(`/api/collections/sync_devices/records/${encodeURIComponent(existing.id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await pbAdmin("/api/collections/sync_devices/records", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    return Response.json({
      device: {
        id: record.id,
        deviceId: record.device_id,
        code: record.code,
        name: record.name,
        enabled: record.enabled === true,
        activatedBy: record.activated_by,
        activatedAt: record.activated_at,
        lastSeenAt: record.last_seen_at,
        appVersion: record.app_version,
        updateChannel: record.update_channel === "pilot" ? "pilot" : "stable",
        updatesEnabled: record.updates_enabled === true,
        installedVersion: record.installed_version,
        lastUpdateStatus: record.last_update_status,
        lastUpdateAt: record.last_update_at,
        lastUpdateVersion: record.last_update_version,
        lastUpdateCode: record.last_update_code,
      },
      user: safeUser(context.user),
      schemaVersion: 1,
    });
  } catch (error) {
    return desktopSyncErrorResponse(error);
  }
}

function safeUser(user: Record<string, unknown>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roles: user.roles,
    password_configured: user.password_configured === true,
    updated: user.updated,
  };
}
