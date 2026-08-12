import { parseStrictSemVer } from "./release-policy.ts";
import { DESKTOP_UPDATE_STATUSES, type DesktopUpdateStatus } from "./types.ts";

export interface DesktopUpdateReport {
  status: DesktopUpdateStatus;
  installedVersion: string;
  updateVersion?: string;
  code?: string;
}

export function parseDesktopUpdateReport(value: unknown): DesktopUpdateReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Reporte inválido");
  const record = value as Record<string, unknown>;
  if (!DESKTOP_UPDATE_STATUSES.includes(record.status as DesktopUpdateStatus)) throw new Error("Estado inválido");
  if (!parseStrictSemVer(record.installedVersion)) throw new Error("Versión instalada inválida");
  if (record.updateVersion !== undefined && !parseStrictSemVer(record.updateVersion)) {
    throw new Error("Versión de actualización inválida");
  }
  if (record.code !== undefined && (typeof record.code !== "string" || !/^[a-z0-9_-]{1,80}$/i.test(record.code))) {
    throw new Error("Código de resultado inválido");
  }
  return {
    status: record.status as DesktopUpdateStatus,
    installedVersion: record.installedVersion as string,
    ...(record.updateVersion ? { updateVersion: record.updateVersion as string } : {}),
    ...(record.code ? { code: record.code as string } : {}),
  };
}
