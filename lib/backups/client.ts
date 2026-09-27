"use client";

import { activeRoleJsonHeaders, canUseAdminFeatures, getValidStoredActiveRole } from "@/lib/active-role";
import { pb } from "@/lib/pocketbase";

export class BackupClientError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

export async function requestBackups(action: "list" | "download", key?: string) {
  const activeRole = getValidStoredActiveRole(pb.authStore.record);
  if (!pb.authStore.isValid || !canUseAdminFeatures(pb.authStore.record, activeRole)) {
    throw new BackupClientError("Sólo los administradores pueden acceder a los backups.", 403);
  }
  if (!navigator.onLine) throw new BackupClientError("Necesitás conexión a Internet para consultar y descargar backups.");
  const desktop = window.consultorioDesktop;
  if (desktop) {
    if (!desktop.backups) throw new BackupClientError("Actualizá la aplicación de Windows para acceder a los backups.");
    const response = await desktop.backups.request({ action, key, localToken: pb.authStore.token, activeRole: "admin" });
    if (!response.ok) throw new BackupClientError(String(response.body.error || "No se pudieron consultar los backups."), response.status);
    return response.body;
  }
  const response = await fetch(`/api/backups${action === "download" ? "/download" : ""}`, {
    method: action === "download" ? "POST" : "GET",
    headers: activeRoleJsonHeaders(pb.authStore.token, activeRole), cache: "no-store",
    body: action === "download" ? JSON.stringify({ key }) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new BackupClientError(body.error || "No se pudieron consultar los backups.", response.status);
  return body as Record<string, unknown>;
}
