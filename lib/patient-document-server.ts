import { ACTIVE_PATIENT_FILTER } from "./patient-merge";
import { pbAdmin } from "./pocketbase-admin";

interface PocketBaseList<T> {
  items?: T[];
}

export type DuplicatePatientDocument = {
  id: string;
  nombre?: string;
  apellido?: string;
  numero_documento?: string;
  dni?: string;
  numero_ficha?: string;
};

export function normalizePatientDocument(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits || trimmed;
}

export async function findDuplicatePatientDocument(documento: string, excludeId = "") {
  const normalized = normalizePatientDocument(documento);
  if (!normalized) {
    return null;
  }

  const variants = Array.from(new Set([documento.trim(), normalized].filter(Boolean)));
  const documentFilters = variants
    .flatMap((variant) => {
      const safe = escapeFilterValue(variant);
      return [`numero_documento = "${safe}"`, `dni = "${safe}"`];
    })
    .join(" || ");

  const filterParts = [ACTIVE_PATIENT_FILTER, `(${documentFilters})`];

  if (excludeId) {
    filterParts.push(`id != "${escapeFilterValue(excludeId)}"`);
  }

  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    fields: "id,nombre,apellido,numero_documento,dni,numero_ficha",
    filter: filterParts.join(" && "),
  });

  const data = (await pbAdmin(`/api/collections/pacientes/records?${params}`)) as PocketBaseList<DuplicatePatientDocument>;
  return data.items?.[0] || null;
}

function escapeFilterValue(value: string) {
  return value.replace(/"/g, '\\"');
}
