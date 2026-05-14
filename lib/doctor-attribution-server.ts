import { ACTIVE_ROLE_HEADER } from "./active-role";
import { pbAdmin } from "./pocketbase-admin";
import { isUserRole, normalizeUserRoles, type UserRole } from "./permissions";

export function activeRoleFromRequest(request: Request, user: Record<string, unknown>) {
  const activeRoleHeader = request.headers.get(ACTIVE_ROLE_HEADER);
  const roles = normalizeUserRoles(user);

  return isUserRole(activeRoleHeader) && roles.includes(activeRoleHeader) ? activeRoleHeader : null;
}

export async function validateDoctorAssignment(user: Record<string, unknown>, activeRole: UserRole | null, medicoId: string) {
  if (!medicoId) return { ok: true };

  if (activeRole === "admin" || activeRole === "secretaria") {
    const doctor = await pbAdmin(`/api/collections/users/records/${encodeURIComponent(medicoId)}`);
    if (!normalizeUserRoles(doctor).includes("medico")) {
      return { ok: false, error: "El usuario seleccionado no es medico." };
    }
    return { ok: true };
  }

  if (activeRole === "medico" && String(user.id || "") === medicoId) {
    return { ok: true };
  }

  return { ok: false, error: "No tenes permisos para asignar ese medico." };
}
