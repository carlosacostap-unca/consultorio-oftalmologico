import { NextRequest } from "next/server";
import { normalizePatientDocument } from "@/lib/patient-document-server";
import { ACTIVE_PATIENT_FILTER, patientDisplayName, patientDocument } from "@/lib/patient-merge";
import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";
import type { Patient } from "@/lib/types";

interface PocketBaseList<T> {
  items?: T[];
  totalPages?: number;
}

interface DuplicateDocumentPatient {
  id: string;
  label: string;
  document: string;
  telefono: string;
  email: string;
  obra_social: string;
  numero_ficha: string;
}

interface DuplicateDocumentGroup {
  documento: string;
  fichaCount: number;
  patientCount: number;
  patients: DuplicateDocumentPatient[];
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const groups = await findDuplicateDocumentGroups();
    const totalPatients = groups.reduce((sum, group) => sum + group.patientCount, 0);
    const totalFichas = groups.reduce((sum, group) => sum + group.fichaCount, 0);

    return Response.json({
      groups,
      totalGroups: groups.length,
      totalPatients,
      totalFichas,
    });
  } catch (error) {
    console.error("Error al consultar DNI duplicados:", error);
    return Response.json({ error: "No se pudieron consultar los DNI duplicados" }, { status: 500 });
  }
}

async function findDuplicateDocumentGroups(): Promise<DuplicateDocumentGroup[]> {
  const groups = new Map<string, DuplicateDocumentPatient[]>();
  const firstPage = await fetchPatientsPage(1);
  addPatientsToGroups(groups, firstPage.items || []);

  const totalPages = firstPage.totalPages || 1;
  const remainingPages = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => index + 2);
  const remainingResults = await mapWithConcurrency(remainingPages, 8, fetchPatientsPage);
  for (const result of remainingResults) {
    addPatientsToGroups(groups, result.items || []);
  }

  return Array.from(groups.entries())
    .map(([documento, patients]) => {
      const uniqueFichas = new Set(patients.map((patient) => normalizeFicha(patient.numero_ficha)).filter(Boolean));
      return {
        documento,
        fichaCount: uniqueFichas.size,
        patientCount: patients.length,
        patients: patients.sort((a, b) => compareFichaThenLabel(a, b)),
      };
    })
    .filter((group) => group.fichaCount > 1)
    .sort((a, b) => b.fichaCount - a.fichaCount || a.documento.localeCompare(b.documento, "es-AR", { numeric: true }));
}

async function fetchPatientsPage(page: number) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: "500",
    sort: "numero_documento,apellido,nombre",
    fields: "id,nombre,apellido,tipo_documento,numero_documento,dni,telefono,email,obra_social,numero_ficha",
    filter: ACTIVE_PATIENT_FILTER,
  });
  return (await pbAdmin(`/api/collections/pacientes/records?${params}`)) as PocketBaseList<Patient>;
}

function addPatientsToGroups(groups: Map<string, DuplicateDocumentPatient[]>, patients: Patient[]) {
  for (const patient of patients) {
    const document = normalizePatientDocument(patientDocument(patient));
    const ficha = normalizeFicha(patient.numero_ficha);
    if (!document || !ficha) continue;

    const duplicatePatients = groups.get(document) || [];
    duplicatePatients.push({
      id: patient.id,
      label: patientDisplayName(patient),
      document: patientDocument(patient),
      telefono: patient.telefono || "",
      email: patient.email || "",
      obra_social: patient.obra_social || "",
      numero_ficha: patient.numero_ficha || "",
    });
    groups.set(document, duplicatePatients);
  }
}

function compareFichaThenLabel(a: DuplicateDocumentPatient, b: DuplicateDocumentPatient) {
  return (
    normalizeFicha(a.numero_ficha).localeCompare(normalizeFicha(b.numero_ficha), "es-AR", { numeric: true }) ||
    a.label.localeCompare(b.label, "es-AR")
  );
}

function normalizeFicha(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  });
  await Promise.all(workers);
  return results;
}
