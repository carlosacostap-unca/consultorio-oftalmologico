import { NextRequest } from "next/server";
import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";
import { ACTIVE_PATIENT_FILTER, MERGED_PATIENT_STATUS, isMergedPatient, patientDisplayName, patientDocument } from "@/lib/patient-merge";
import type { Patient } from "@/lib/types";

interface PocketBaseList<T> {
  items?: T[];
  totalItems?: number;
  totalPages?: number;
}

interface RelatedCounts {
  turnos: number;
  consultas: number;
  recetas: number;
}

interface RecentActivity {
  turnos: Array<{ id: string; fecha_hora?: string; motivo?: string; estado?: string; tipo?: string }>;
  consultas: Array<{ id: string; fecha?: string; motivo_consulta?: string; diagnostico?: string }>;
  recetas: Array<{ id: string; fecha?: string; medicamentos?: string; indicaciones?: string }>;
}

interface PatientSummary {
  patient: Patient;
  counts: RelatedCounts;
  recent: RecentActivity;
}

const RELATED_COLLECTIONS = ["turnos", "consultas", "recetas"] as const;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const primaryId = searchParams.get("primaryId") || "";
    const duplicateId = searchParams.get("duplicateId") || "";
    const query = (searchParams.get("q") || "").trim();

    if (primaryId && duplicateId) {
      return Response.json({
        comparison: await comparePatients(primaryId, duplicateId),
      });
    }

    const [patients, candidateGroups] = await Promise.all([
      searchPatients(query),
      query ? Promise.resolve([]) : findCandidateGroups(),
    ]);

    return Response.json({ patients, candidateGroups });
  } catch (error) {
    console.error("Error al consultar duplicados de pacientes:", error);
    return Response.json({ error: "No se pudieron consultar los duplicados" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin?.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const primaryPatientId = String(body.primaryPatientId || "").trim();
    const duplicatePatientId = String(body.duplicatePatientId || "").trim();
    const confirmation = String(body.confirmation || "").trim().toUpperCase();
    const motivo = String(body.motivo || "").trim();

    if (!primaryPatientId || !duplicatePatientId || primaryPatientId === duplicatePatientId) {
      return Response.json({ error: "Selecciona dos pacientes distintos" }, { status: 400 });
    }

    if (confirmation !== "FUSIONAR") {
      return Response.json({ error: "Confirma la fusion escribiendo FUSIONAR" }, { status: 400 });
    }

    const [primaryPatient, duplicatePatient] = await Promise.all([
      getPatient(primaryPatientId),
      getPatient(duplicatePatientId),
    ]);

    if (isMergedPatient(primaryPatient)) {
      return Response.json({ error: "El paciente principal ya fue fusionado con otro registro" }, { status: 400 });
    }

    if (isMergedPatient(duplicatePatient)) {
      return Response.json({
        error: "El paciente duplicado ya fue fusionado",
        mergedIntoPatientId: duplicatePatient.fusionado_en_paciente_id,
      }, { status: 400 });
    }

    const counts: RelatedCounts = { turnos: 0, consultas: 0, recetas: 0 };
    for (const collection of RELATED_COLLECTIONS) {
      counts[collection] = await reassignRelatedRecords(collection, duplicatePatientId, primaryPatientId);
    }

    const mergedAt = new Date().toISOString();
    await pbAdmin(`/api/collections/pacientes/records/${encodeURIComponent(duplicatePatientId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        estado_registro: MERGED_PATIENT_STATUS,
        fusionado_en_paciente_id: primaryPatientId,
        fusionado_at: mergedAt,
        fusionado_por: admin.id,
        fusion_motivo: motivo,
      }),
    });

    return Response.json({
      ok: true,
      primaryPatient: await getPatient(primaryPatientId),
      duplicatePatient: await getPatient(duplicatePatientId),
      counts,
      message: "Pacientes fusionados correctamente",
    });
  } catch (error) {
    console.error("Error al fusionar pacientes:", error);
    return Response.json({ error: "No se pudo completar la fusion de pacientes" }, { status: 500 });
  }
}

async function comparePatients(primaryId: string, duplicateId: string) {
  const [primary, duplicate] = await Promise.all([
    patientSummary(primaryId),
    patientSummary(duplicateId),
  ]);

  return { primary, duplicate };
}

async function patientSummary(patientId: string): Promise<PatientSummary> {
  const [patient, counts, recent] = await Promise.all([
    getPatient(patientId),
    relatedCounts(patientId),
    recentActivity(patientId),
  ]);

  return { patient, counts, recent };
}

async function getPatient(patientId: string) {
  return pbAdmin(`/api/collections/pacientes/records/${encodeURIComponent(patientId)}?expand=fusionado_en_paciente_id,fusionado_por`) as Promise<Patient>;
}

async function searchPatients(query: string) {
  const filter = query ? `${ACTIVE_PATIENT_FILTER} && (${searchFilter(query)})` : ACTIVE_PATIENT_FILTER;
  const params = new URLSearchParams({
    page: "1",
    perPage: "30",
    sort: "apellido,nombre",
    filter,
  });
  const result = (await pbAdmin(`/api/collections/pacientes/records?${params}`)) as PocketBaseList<Patient>;

  return Promise.all((result.items || []).map(async (patient) => ({
    patient,
    counts: await relatedCounts(patient.id),
  })));
}

async function findCandidateGroups() {
  const params = new URLSearchParams({
    page: "1",
    perPage: "300",
    sort: "apellido,nombre",
    filter: ACTIVE_PATIENT_FILTER,
  });
  const result = (await pbAdmin(`/api/collections/pacientes/records?${params}`)) as PocketBaseList<Patient>;
  const groups = new Map<string, { reason: string; patients: Patient[] }>();

  for (const patient of result.items || []) {
    addCandidateGroup(groups, "Documento", patientDocument(patient), patient);
    addCandidateGroup(groups, "Telefono", patient.telefono, patient);
    addCandidateGroup(groups, "Ficha", patient.numero_ficha, patient);
    addCandidateGroup(groups, "Nombre parecido", `${patient.apellido || ""}|${patient.nombre || ""}`, patient);
  }

  return Array.from(groups.values())
    .filter((group) => group.patients.length > 1)
    .slice(0, 20)
    .map((group) => ({
      reason: group.reason,
      patients: group.patients.map((patient) => ({
        id: patient.id,
        label: patientDisplayName(patient),
        document: patientDocument(patient),
        telefono: patient.telefono || "",
        numero_ficha: patient.numero_ficha || "",
      })),
    }));
}

function addCandidateGroup(groups: Map<string, { reason: string; patients: Patient[] }>, reason: string, value: string | undefined, patient: Patient) {
  const keyValue = normalizeGroupValue(value);
  if (!keyValue) return;

  const key = `${reason}:${keyValue}`;
  const existing = groups.get(key) || { reason, patients: [] };
  existing.patients.push(patient);
  groups.set(key, existing);
}

function normalizeGroupValue(value: string | undefined) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return normalized.length >= 3 ? normalized : "";
}

function searchFilter(query: string) {
  const terms = query
    .toLowerCase()
    .replace(/"/g, '\\"')
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return "id != ''";

  return terms
    .map((term) => `(nombre ~ "${term}" || apellido ~ "${term}" || numero_documento ~ "${term}" || telefono ~ "${term}" || numero_ficha ~ "${term}")`)
    .join(" && ");
}

async function relatedCounts(patientId: string): Promise<RelatedCounts> {
  const [turnos, consultas, recetas] = await Promise.all([
    countRelated("turnos", patientId),
    countRelated("consultas", patientId),
    countRelated("recetas", patientId),
  ]);

  return { turnos, consultas, recetas };
}

async function recentActivity(patientId: string): Promise<RecentActivity> {
  const [turnos, consultas, recetas] = await Promise.all([
    listRecentRecords<RecentActivity["turnos"][number]>("turnos", patientId, "-fecha_hora", "id,fecha_hora,motivo,estado,tipo"),
    listRecentRecords<RecentActivity["consultas"][number]>("consultas", patientId, "-fecha", "id,fecha,motivo_consulta,diagnostico"),
    listRecentRecords<RecentActivity["recetas"][number]>("recetas", patientId, "-fecha", "id,fecha,medicamentos,indicaciones"),
  ]);

  return { turnos, consultas, recetas };
}

async function listRecentRecords<T>(collection: string, patientId: string, sort: string, fields: string) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "3",
    sort,
    fields,
    filter: `paciente_id = "${escapeFilterValue(patientId)}"`,
  });
  const result = (await pbAdmin(`/api/collections/${collection}/records?${params}`)) as PocketBaseList<T>;
  return result.items || [];
}

async function countRelated(collection: string, patientId: string) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    filter: `paciente_id = "${escapeFilterValue(patientId)}"`,
  });
  const result = (await pbAdmin(`/api/collections/${collection}/records?${params}`)) as PocketBaseList<unknown>;
  return result.totalItems || 0;
}

async function reassignRelatedRecords(collection: string, fromPatientId: string, toPatientId: string) {
  const records = await listRelatedRecords(collection, fromPatientId);
  for (const record of records) {
    await pbAdmin(`/api/collections/${collection}/records/${encodeURIComponent(record.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ paciente_id: toPatientId }),
    });
  }
  return records.length;
}

async function listRelatedRecords(collection: string, patientId: string) {
  const records: Array<{ id: string }> = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: "200",
      fields: "id",
      filter: `paciente_id = "${escapeFilterValue(patientId)}"`,
    });
    const result = (await pbAdmin(`/api/collections/${collection}/records?${params}`)) as PocketBaseList<{ id: string }>;
    records.push(...(result.items || []));
    totalPages = result.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return records;
}

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
