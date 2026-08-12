import "server-only";

import { authenticatedUser } from "../pocketbase-admin";
import { pbAdmin } from "../pocketbase-admin";
import { DESKTOP_DEVICE_HEADER, findDeviceByKey } from "../desktop-sync/server-auth";
import type { DesktopSyncUser } from "../desktop-sync/server-auth";
import type { SyncDevice } from "../desktop-sync/types";
import { desktopUpdateServerConfig } from "./config";
import { desktopUpdateAccessDecision } from "./device-policy";
import type { DesktopUpdateServerConfig } from "./config-policy";
import type { DesktopUpdateReport } from "./report-policy";

export interface DesktopUpdateContext {
  user: DesktopSyncUser;
  device: SyncDevice;
  config: Extract<DesktopUpdateServerConfig, { enabled: true }>;
}

export class DesktopUpdateHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function requireDesktopUpdateContext(request: Request): Promise<DesktopUpdateContext> {
  const config = desktopUpdateServerConfig();
  if (!config.enabled) {
    throw new DesktopUpdateHttpError("Las actualizaciones de escritorio no están habilitadas", 503, "updates_disabled");
  }

  const record = await authenticatedUser(request);
  const deviceId = request.headers.get(DESKTOP_DEVICE_HEADER)?.trim() || "";
  const device = record?.id && deviceId ? await findDeviceByKey(deviceId) : null;
  const decision = desktopUpdateAccessDecision({
    sessionValid: Boolean(record?.id),
    requestedDeviceId: deviceId,
    device,
  });

  if (!decision.allowed) {
    throw new DesktopUpdateHttpError(updateAccessMessage(decision.code), decision.status, decision.code);
  }
  return { user: record as DesktopSyncUser, device: device!, config };
}

export function desktopUpdateErrorResponse(error: unknown) {
  if (error instanceof DesktopUpdateHttpError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error("Error de actualización de escritorio:", safeErrorCode(error));
  return Response.json(
    { error: "No se pudo completar la operación de actualización", code: "internal_error" },
    { status: 500 },
  );
}

export async function recordDesktopUpdateReport(deviceRecordId: string, report: DesktopUpdateReport) {
  await pbAdmin(`/api/collections/sync_devices/records/${encodeURIComponent(deviceRecordId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      installed_version: report.installedVersion,
      last_update_status: report.status,
      last_update_at: new Date().toISOString(),
      last_update_version: report.updateVersion || "",
      last_update_code: report.code || "",
    }),
  });
}

function updateAccessMessage(code: string) {
  if (code === "invalid_session") return "La sesión central no es válida";
  if (code === "missing_device") return "Falta la identidad del equipo";
  if (code === "unknown_device") return "El equipo no está activado";
  if (code === "disabled_device") return "El equipo está deshabilitado";
  if (code === "updates_disabled") return "Las actualizaciones están deshabilitadas para este equipo";
  return "El equipo no puede acceder a actualizaciones";
}

function safeErrorCode(error: unknown) {
  if (error instanceof Error) return error.name;
  return "UnknownError";
}
