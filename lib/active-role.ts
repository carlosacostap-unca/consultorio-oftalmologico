import {
  ROLE_LABELS,
  hasAdminRole,
  isUserRole,
  normalizeUserRoles,
  type RoleLikeRecord,
  type UserRole,
} from "./permissions";

export const ACTIVE_ROLE_HEADER = "x-active-role";
export const ACTIVE_ROLE_CHANGED_EVENT = "consultorio-active-role-changed";

export interface ActiveRoleUser extends RoleLikeRecord {
  id?: string;
}

export function activeRoleStorageKey(userId: string) {
  return `consultorio.activeRole.${userId}`;
}

export function activeRoleLabel(role: UserRole | null | undefined) {
  return role ? ROLE_LABELS[role] : "";
}

export function preferredActiveRole(roles: readonly UserRole[]): UserRole | null {
  if (roles.includes("medico")) return "medico";
  return roles[0] || null;
}

export function getStoredActiveRole(user: ActiveRoleUser | null | undefined): UserRole | null {
  if (typeof window === "undefined" || !user?.id) return null;

  const role = window.localStorage.getItem(activeRoleStorageKey(user.id));
  return isUserRole(role) ? role : null;
}

export function getValidStoredActiveRole(user: ActiveRoleUser | null | undefined): UserRole | null {
  const role = getStoredActiveRole(user);
  if (!role) return null;

  return normalizeUserRoles(user).includes(role) ? role : null;
}

export function resolveActiveRole(user: ActiveRoleUser | null | undefined, fallback: UserRole[] = []): UserRole | null {
  const roles = normalizeUserRoles(user, fallback);
  return getValidStoredActiveRole(user) || preferredActiveRole(roles);
}

export function setActiveRole(userId: string, role: UserRole) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(activeRoleStorageKey(userId), role);
  window.dispatchEvent(new CustomEvent(ACTIVE_ROLE_CHANGED_EVENT, { detail: { userId, role } }));
}

export function clearActiveRole(userId?: string) {
  if (typeof window === "undefined") return;

  if (userId) {
    window.localStorage.removeItem(activeRoleStorageKey(userId));
  }
  window.dispatchEvent(new CustomEvent(ACTIVE_ROLE_CHANGED_EVENT, { detail: { userId, role: null } }));
}

export function activeRoleAuthHeaders(token: string, activeRole: UserRole | null | undefined) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

  if (activeRole) {
    headers[ACTIVE_ROLE_HEADER] = activeRole;
  }

  return headers;
}

export function activeRoleJsonHeaders(token: string, activeRole: UserRole | null | undefined) {
  return {
    "Content-Type": "application/json",
    ...activeRoleAuthHeaders(token, activeRole),
  };
}

export function canUseAdminFeatures(user: ActiveRoleUser | null | undefined, activeRole: UserRole | null | undefined) {
  return activeRole === "admin" && hasAdminRole(user);
}
