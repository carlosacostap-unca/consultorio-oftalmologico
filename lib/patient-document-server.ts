import { ACTIVE_PATIENT_FILTER } from "./patient-merge";
import { pbAdmin } from "./pocketbase-admin";

interface PocketBaseList<T> {
  items?: T[];
}

interface PocketBaseCollection {
  fields?: Array<{ name?: string }>;
  schema?: Array<{ name?: string }>;
}

export type DuplicatePatientDocument = {
  id: string;
  nombre?: string;
  apellido?: string;
  tipo_documento?: string;
  numero_documento?: string;
  dni?: string;
  numero_ficha?: string;
};

export function normalizePatientDocument(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits || trimmed;
}

export async function findDuplicatePatientDocument(documento: string, excludeId = "", tipoDocumento = "DNI") {
  const normalized = normalizePatientDocument(documento);
  if (!normalized) {
    return null;
  }

  const variants = Array.from(new Set([documento.trim(), normalized].filter(Boolean)));
  const documentFieldNames = await patientDocumentFieldNames();
  const patientFieldNames = await patientFieldNameSet();
  const documentFilters = variants
    .flatMap((variant) => {
      const safe = escapeFilterValue(variant);
      return documentFieldNames.map((fieldName) => `${fieldName} = "${safe}"`);
    })
    .join(" || ");

  const filterParts = [ACTIVE_PATIENT_FILTER, `(${documentFilters})`];
  const normalizedTipoDocumento = tipoDocumento.trim().toUpperCase();

  if (normalizedTipoDocumento && patientFieldNames.has("tipo_documento")) {
    filterParts.push(`tipo_documento = "${escapeFilterValue(normalizedTipoDocumento)}"`);
  }

  if (excludeId) {
    filterParts.push(`id != "${escapeFilterValue(excludeId)}"`);
  }

  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    fields: ["id", "nombre", "apellido", "tipo_documento", ...documentFieldNames, "numero_ficha"].join(","),
    filter: filterParts.join(" && "),
  });

  const data = (await pbAdmin(`/api/collections/pacientes/records?${params}`)) as PocketBaseList<DuplicatePatientDocument>;
  return data.items?.[0] || null;
}

function escapeFilterValue(value: string) {
  return value.replace(/"/g, '\\"');
}

let cachedPatientDocumentFieldNames: string[] | null = null;
let cachedPatientFieldNames: Set<string> | null = null;

async function patientDocumentFieldNames() {
  if (cachedPatientDocumentFieldNames) {
    return cachedPatientDocumentFieldNames;
  }

  const schemaFieldNames = await patientFieldNameSet();
  cachedPatientDocumentFieldNames = ["numero_documento", "dni"].filter((fieldName) => schemaFieldNames.has(fieldName));

  if (cachedPatientDocumentFieldNames.length === 0) {
    cachedPatientDocumentFieldNames = ["numero_documento"];
  }

  return cachedPatientDocumentFieldNames;
}

async function patientFieldNameSet() {
  if (cachedPatientFieldNames) {
    return cachedPatientFieldNames;
  }

  const collection = (await pbAdmin("/api/collections/pacientes")) as PocketBaseCollection;
  const fields = collection.fields || collection.schema || [];
  cachedPatientFieldNames = new Set(fields.map((field) => field.name).filter((name): name is string => Boolean(name)));
  return cachedPatientFieldNames;
}
