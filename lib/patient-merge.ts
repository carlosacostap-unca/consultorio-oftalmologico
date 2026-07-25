import type { Patient } from "./types";

export const MERGED_PATIENT_STATUS = "fusionado";
export const ACTIVE_PATIENT_FILTER = `estado_registro != "${MERGED_PATIENT_STATUS}"`;

export function isMergedPatient(patient: Pick<Patient, "estado_registro" | "fusionado_en_paciente_id"> | null | undefined) {
  return Boolean(patient?.fusionado_en_paciente_id || patient?.estado_registro === MERGED_PATIENT_STATUS);
}

export function appendActivePatientFilter(filter: string) {
  return filter ? `(${ACTIVE_PATIENT_FILTER}) && (${filter})` : ACTIVE_PATIENT_FILTER;
}

const DEFAULT_PATIENT_SEARCH_FIELDS = ["nombre", "apellido", "numero_documento", "numero_ficha"];

export function escapePocketBaseFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function removeDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function uniqueSearchTermVariants(term: string) {
  const variants = [
    term,
    term.toLowerCase(),
    term.toUpperCase(),
    term.toLocaleLowerCase("es-AR"),
    term.toLocaleUpperCase("es-AR"),
  ];
  const withoutDiacritics = removeDiacritics(term);
  variants.push(
    withoutDiacritics,
    withoutDiacritics.toLowerCase(),
    withoutDiacritics.toUpperCase(),
    withoutDiacritics.toLocaleLowerCase("es-AR"),
    withoutDiacritics.toLocaleUpperCase("es-AR")
  );

  return [...new Set(variants.map((variant) => variant.trim()).filter(Boolean))];
}

export function buildPatientSearchFilter(query: string, fields = DEFAULT_PATIENT_SEARCH_FIELDS) {
  const terms = query.trim().split(/\s+/).filter((term) => term.length > 0);

  if (terms.length === 0) {
    return "";
  }

  return terms
    .map((term) => {
      const variantFilters = uniqueSearchTermVariants(term).flatMap((variant) => {
        const safeVariant = escapePocketBaseFilterValue(variant);
        return fields.map((field) => `${field} ~ "${safeVariant}"`);
      });
      return `(${variantFilters.join(" || ")})`;
    })
    .join(" && ");
}

export function buildActivePatientSearchFilter(query: string, fields = DEFAULT_PATIENT_SEARCH_FIELDS) {
  return appendActivePatientFilter(buildPatientSearchFilter(query, fields));
}

export function patientDisplayName(patient: Pick<Patient, "nombre" | "apellido"> | null | undefined) {
  if (!patient) return "Paciente";
  return `${patient.apellido || ""}, ${patient.nombre || ""}`.replace(/^,\s*/, "").trim() || "Paciente";
}

export function patientDocument(patient: Pick<Patient, "dni" | "numero_documento"> | null | undefined) {
  return patient?.numero_documento || patient?.dni || "";
}
