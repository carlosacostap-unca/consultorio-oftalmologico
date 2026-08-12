import { normalizeDeviceCode } from "@/lib/desktop-sync/core";
import {
  DesktopSyncHttpError,
  desktopSyncErrorResponse,
  findDeviceRecordByKey,
  requireDesktopSyncContext,
} from "@/lib/desktop-sync/server-auth";
import { canActivateDesktopDevice } from "@/lib/desktop-sync/server-auth-policy";
import {
  desktopDeviceActivationPayload,
  mapDesktopDeviceRecord,
} from "@/lib/desktop-sync/device-record-compat";
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

    const existing = await findDeviceRecordByKey(deviceId);
    const existingDevice = existing ? mapDesktopDeviceRecord(existing) : null;

    if (!canActivateDesktopDevice(context.roles, Boolean(existing))) {
      throw new DesktopSyncHttpError(
        "Sólo un administrador puede registrar un equipo nuevo",
        403,
        "device_enrollment_forbidden",
      );
    }

    if (existingDevice && existingDevice.enabled !== true) {
      return Response.json({ error: "El equipo está deshabilitado", code: "disabled_device" }, { status: 403 });
    }
    if (existingDevice?.code && existingDevice.code !== code) {
      return Response.json({ error: "El código del equipo activado no puede cambiar", code: "immutable_device_code" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const payload = desktopDeviceActivationPayload({
      deviceId, code, name, appVersion, actorId: context.user.id, now, existing,
    });
    const record = existing
      ? await pbAdmin(`/api/collections/sync_devices/records/${encodeURIComponent(String(existing.id || ""))}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await pbAdmin("/api/collections/sync_devices/records", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    const mappedRecord = mapDesktopDeviceRecord(record);
    return Response.json({
      device: {
        ...mappedRecord,
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
