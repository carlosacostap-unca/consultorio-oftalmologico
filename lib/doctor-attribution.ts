import type { Medico } from "./types";
import type { UserRole } from "./permissions";

export function doctorLabel(doctor?: Pick<Medico, "name" | "email"> | null) {
  return doctor?.name || doctor?.email || "Medico no registrado";
}

export function canAssignAnyDoctor(role?: UserRole | null) {
  return role === "admin" || role === "secretaria";
}

export function canAssignOwnDoctor(role?: UserRole | null) {
  return role === "medico";
}
