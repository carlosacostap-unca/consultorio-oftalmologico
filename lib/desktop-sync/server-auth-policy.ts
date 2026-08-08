import type { PermissionKey, UserRole } from "../permissions";
import type { SyncEntity, SyncOperationAction, SyncRecord } from "./types";

export type DesktopDeviceAccess = "skip" | "missing" | "lookup";

interface DesktopOperationPolicyInput {
  roles: readonly UserRole[];
  permissions: readonly PermissionKey[];
  userId: string;
  entity: SyncEntity;
  action: SyncOperationAction;
  payload: SyncRecord;
  centralRecord?: SyncRecord | null;
}

export function desktopDeviceAccess(
  requireDevice: boolean | undefined,
  deviceId: string,
): DesktopDeviceAccess {
  if (requireDevice !== true) return "skip";
  return deviceId ? "lookup" : "missing";
}

export function canActivateDesktopDevice(roles: readonly UserRole[], alreadyRegistered: boolean) {
  return alreadyRegistered || roles.includes("admin");
}

export function desktopConflictOwnershipFilters(
  roles: readonly UserRole[],
  deviceId: string,
  userId: string,
) {
  if (roles.includes("admin")) return [];
  return [
    `device_id = "${escapePolicyFilterValue(deviceId)}"`,
    `actor_id = "${escapePolicyFilterValue(userId)}"`,
  ];
}

export function isDesktopOperationAllowed(input: DesktopOperationPolicyInput) {
  if (input.roles.includes("admin")) return true;

  const requiredPermission = operationPermission(input.entity, input.action);
  if (!input.permissions.includes(requiredPermission)) return false;

  if (input.entity === "pacientes") return true;
  if (!input.roles.includes("medico")) return false;

  const authoritativeRecord = input.action === "create" ? input.payload : input.centralRecord;
  if (String(authoritativeRecord?.medico_id || "") !== input.userId) return false;

  return input.action !== "update"
    || input.payload.medico_id === undefined
    || String(input.payload.medico_id) === input.userId;
}

function operationPermission(entity: SyncEntity, action: SyncOperationAction): PermissionKey {
  if (entity === "recetas") return "recetas.manage";
  return `${entity}.${action === "update" ? "edit" : action}` as PermissionKey;
}

function escapePolicyFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
