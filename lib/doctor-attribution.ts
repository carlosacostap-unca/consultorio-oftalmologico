import type { Medico } from "./types";
import type { UserRole } from "./permissions";

export function doctorLabel(doctor?: Pick<Medico, "name" | "email"> | null) {
  return doctor?.name || doctor?.email || "Medico no registrado";
}

export function doctorLabelFromList(
  medicoId: string | undefined,
  expandedDoctor: Pick<Medico, "id" | "name" | "email"> | null | undefined,
  medicos: readonly Pick<Medico, "id" | "name" | "email">[]
) {
  return doctorLabel(expandedDoctor || medicos.find((medico) => medico.id === medicoId) || null);
}

export function canAssignAnyDoctor(role?: UserRole | null) {
  return role === "admin" || role === "secretaria";
}

export function canAssignOwnDoctor(role?: UserRole | null) {
  return role === "medico";
}
