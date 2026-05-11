import type { Patient } from "./types";

export const MERGED_PATIENT_STATUS = "fusionado";
export const ACTIVE_PATIENT_FILTER = `estado_registro != "${MERGED_PATIENT_STATUS}"`;

export function isMergedPatient(patient: Pick<Patient, "estado_registro" | "fusionado_en_paciente_id"> | null | undefined) {
  return Boolean(patient?.fusionado_en_paciente_id || patient?.estado_registro === MERGED_PATIENT_STATUS);
}

export function appendActivePatientFilter(filter: string) {
  return filter ? `(${ACTIVE_PATIENT_FILTER}) && (${filter})` : ACTIVE_PATIENT_FILTER;
}

export function patientDisplayName(patient: Pick<Patient, "nombre" | "apellido"> | null | undefined) {
  if (!patient) return "Paciente";
  return `${patient.apellido || ""}, ${patient.nombre || ""}`.replace(/^,\s*/, "").trim() || "Paciente";
}

export function patientDocument(patient: Pick<Patient, "dni" | "numero_documento"> | null | undefined) {
  return patient?.numero_documento || patient?.dni || "";
}
