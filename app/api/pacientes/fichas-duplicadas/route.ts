import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeOptionalClinicalZeros } from "@/lib/clinical-empty-values";
import { loadDatomedConsultasByFicha, normalizeFicha as normalizeDatomedFicha } from "@/lib/datomed-import";
import { findDuplicateFicha, getNextFichaNumber } from "@/lib/patient-ficha-server";
import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";
import { ACTIVE_PATIENT_FILTER, patientDisplayName, patientDocument } from "@/lib/patient-merge";
import { normalizeUserRoles, type RoleLikeRecord } from "@/lib/permissions";
import type { Patient } from "@/lib/types";

interface PocketBaseList<T> {
  items?: T[];
  totalItems?: number;
  totalPages?: number;
}

interface DuplicateFichaPatient {
  id: string;
  label: string;
  document: string;
  telefono: string;
  email: string;
  obra_social: string;
  numero_ficha: string;
  consultasCount: number;
}

interface DuplicateFichaGroup {
  ficha: string;
  patientCount: number;
  patients: DuplicateFichaPatient[];
}

type ConsultaRecord = Record<string, unknown> & { id: string; paciente_id?: string; consulta_id?: string };
type UserRecord = RoleLikeRecord & { id: string; email?: string; name?: string };

const MAX_NEXT_FICHA_ATTEMPTS = 10000;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const requestedFicha = normalizeFicha(request.nextUrl.searchParams.get("ficha") || "");
    if (requestedFicha) {
      const group = await findFichaGroup(requestedFicha);
      if (!group) {
        return Response.json({ error: "No se encontro la ficha solicitada" }, { status: 404 });
      }

      return Response.json({
        group,
        totalPatients: group.patientCount,
        totalConsultas: group.patients.reduce((sum, patient) => sum + patient.consultasCount, 0),
      });
    }

    const groups = await findDuplicateFichaGroups();
    const totalPatients = groups.reduce((sum, group) => sum + group.patientCount, 0);

    return Response.json({
      groups,
      totalGroups: groups.length,
      totalPatients,
    });
  } catch (error) {
    console.error("Error al consultar fichas duplicadas:", error);
    return Response.json({ error: "No se pudieron consultar las fichas duplicadas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin?.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const action = String(body.action || "queda").trim().toLowerCase();
    const patientId = String(body.patientId || "").trim();
    const confirmation = String(body.confirmation || "").trim().toUpperCase();

    if (!patientId) {
      return Response.json({ error: "Selecciona un paciente" }, { status: 400 });
    }

    if (action !== "queda" && action !== "separar") {
      return Response.json({ error: "Accion no valida" }, { status: 400 });
    }

    const expectedConfirmation = action === "separar" ? "SEPARAR" : "QUEDA";
    if (confirmation !== expectedConfirmation) {
      return Response.json({ error: `Confirma la accion escribiendo ${expectedConfirmation}` }, { status: 400 });
    }

    const patient = (await pbAdmin(`/api/collections/pacientes/records/${encodeURIComponent(patientId)}`)) as Patient;
    const ficha = normalizeDatomedFicha(patient.numero_ficha);
    if (!ficha) {
      return Response.json({ error: "El paciente no tiene numero de ficha" }, { status: 400 });
    }

    const datomedRows = loadDatomedConsultasByFicha(ficha);
    if (datomedRows.length === 0) {
      return Response.json({ error: `DATOMED.DBF no tiene consultas para la ficha ${ficha}` }, { status: 400 });
    }

    const existingConsultas = await listAllRecords<ConsultaRecord>("consultas", `paciente_id = "${escapeFilterValue(patientId)}"`, "id,paciente_id,numero_ficha,fecha,motivo_consulta,diagnostico,tratamiento,estado");
    const consultaIds = existingConsultas.map((consulta) => consulta.id);
    const existingEvents = consultaIds.length > 0
      ? await listConsultaEventsForConsultas(consultaIds)
      : [];
    const nextFicha = action === "separar" ? await getNextAvailableFichaForPatient(patientId) : ficha;
    const medicoId = await resolveImportMedicoId(admin);
    if (!medicoId) {
      return Response.json({ error: "No hay un medico disponible para asignar a las consultas importadas" }, { status: 400 });
    }

    const backup = await writeFichaActionBackup({
      action,
      patient,
      ficha,
      nextFicha,
      adminId: admin.id,
      consultas: existingConsultas,
      consultaEventos: existingEvents,
      datomedRows: datomedRows.length,
    });

    const created = await mapWithConcurrency(datomedRows, 8, (row) => (
      pbAdmin("/api/collections/consultas/records", {
        method: "POST",
        body: JSON.stringify(normalizeOptionalClinicalZeros({
          ...row.payload,
          paciente_id: patientId,
          numero_ficha: nextFicha,
          medico_id: medicoId,
        })),
      }) as Promise<ConsultaRecord>
    ));

    if (action === "separar") {
      await pbAdmin(`/api/collections/pacientes/records/${encodeURIComponent(patientId)}`, {
        method: "PATCH",
        body: JSON.stringify({ numero_ficha: nextFicha }),
      });
    }

    await mapWithConcurrency(existingEvents, 8, (event) => deleteRecord("consulta_eventos", event.id));
    await mapWithConcurrency(existingConsultas, 8, (consulta) => deleteRecord("consultas", consulta.id));

    return Response.json({
      ok: true,
      action,
      patientId,
      ficha: nextFicha,
      previousFicha: ficha,
      deletedConsultas: existingConsultas.length,
      deletedConsultaEventos: existingEvents.length,
      importedConsultas: created.length,
      backupPath: backup.path,
      backupError: backup.error,
      message: action === "separar"
        ? `Se separo el paciente en la ficha ${nextFicha} y se importaron ${created.length} consultas`
        : `Se importaron ${created.length} consultas para la ficha ${ficha}`,
    });
  } catch (error) {
    console.error("Error al reemplazar consultas desde DATOMED:", error);
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo reemplazar las consultas desde DATOMED" }, { status: 500 });
  }
}

async function findFichaGroup(ficha: string): Promise<DuplicateFichaGroup | null> {
  const patients = await fetchPatientsByFicha(ficha);
  if (patients.length === 0) {
    return null;
  }

  const normalizedPatients = patients
    .map((patient) => ({
      id: patient.id,
      label: patientDisplayName(patient),
      document: patientDocument(patient),
      telefono: patient.telefono || "",
      email: patient.email || "",
      obra_social: patient.obra_social || "",
      numero_ficha: patient.numero_ficha || "",
      consultasCount: 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es-AR"));
  const consultasCounts = await countConsultasByPatient(normalizedPatients.map((patient) => patient.id));

  return {
    ficha,
    patientCount: normalizedPatients.length,
    patients: normalizedPatients.map((patient) => ({
      ...patient,
      consultasCount: consultasCounts.get(patient.id) || 0,
    })),
  };
}

async function findDuplicateFichaGroups(): Promise<DuplicateFichaGroup[]> {
  const groups = new Map<string, DuplicateFichaPatient[]>();
  const firstPage = await fetchPatientsPage(1);
  addPatientsToGroups(groups, firstPage.items || []);

  const remainingPages = Array.from({ length: Math.max((firstPage.totalPages || 1) - 1, 0) }, (_, index) => index + 2);
  const remainingResults = await mapWithConcurrency(remainingPages, 8, fetchPatientsPage);
  for (const result of remainingResults) {
    addPatientsToGroups(groups, result.items || []);
  }

  const duplicateEntries = Array.from(groups.entries()).filter(([, patients]) => patients.length > 1);
  const patientIds = duplicateEntries.flatMap(([, patients]) => patients.map((patient) => patient.id));
  const consultasCounts = await countConsultasByPatient(patientIds);

  return duplicateEntries
    .map(([ficha, patients]) => ({
      ficha,
      patientCount: patients.length,
      patients: patients
        .map((patient) => ({
          ...patient,
          consultasCount: consultasCounts.get(patient.id) || 0,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es-AR")),
    }))
    .sort((a, b) => a.ficha.localeCompare(b.ficha, "es-AR", { numeric: true }));
}

async function fetchPatientsByFicha(ficha: string) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "500",
    sort: "apellido,nombre",
    fields: "id,nombre,apellido,tipo_documento,numero_documento,dni,telefono,email,obra_social,numero_ficha",
    filter: `${ACTIVE_PATIENT_FILTER} && numero_ficha = "${escapeFilterValue(ficha)}"`,
  });
  const result = (await pbAdmin(`/api/collections/pacientes/records?${params}`)) as PocketBaseList<Patient>;
  return result.items || [];
}

async function fetchPatientsPage(page: number) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: "500",
    sort: "numero_ficha,apellido,nombre",
    fields: "id,nombre,apellido,tipo_documento,numero_documento,dni,telefono,email,obra_social,numero_ficha",
    filter: ACTIVE_PATIENT_FILTER,
  });
  return (await pbAdmin(`/api/collections/pacientes/records?${params}`)) as PocketBaseList<Patient>;
}

function addPatientsToGroups(groups: Map<string, DuplicateFichaPatient[]>, patients: Patient[]) {
  for (const patient of patients) {
    const ficha = normalizeFicha(patient.numero_ficha);
    if (!ficha) continue;

    const duplicatePatients = groups.get(ficha) || [];
    duplicatePatients.push({
      id: patient.id,
      label: patientDisplayName(patient),
      document: patientDocument(patient),
      telefono: patient.telefono || "",
      email: patient.email || "",
      obra_social: patient.obra_social || "",
      numero_ficha: patient.numero_ficha || "",
      consultasCount: 0,
    });
    groups.set(ficha, duplicatePatients);
  }
}

async function countConsultasByPatient(patientIds: string[]) {
  const counts = new Map<string, number>();
  const uniquePatientIds = [...new Set(patientIds)];
  const chunks = chunk(uniquePatientIds, 35);

  await mapWithConcurrency(chunks, 4, async (patientIdChunk) => {
    const records = await fetchConsultasForPatients(patientIdChunk);
    for (const record of records) {
      if (!record.paciente_id) continue;
      counts.set(record.paciente_id, (counts.get(record.paciente_id) || 0) + 1);
    }
  });

  return counts;
}

async function fetchConsultasForPatients(patientIds: string[]) {
  const records: Array<{ paciente_id?: string }> = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: "500",
      fields: "paciente_id",
      filter: patientIds.map((id) => `paciente_id = "${escapeFilterValue(id)}"`).join(" || "),
    });
    const result = (await pbAdmin(`/api/collections/consultas/records?${params}`)) as PocketBaseList<{ paciente_id?: string }>;
    records.push(...(result.items || []));
    totalPages = result.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return records;
}

async function listConsultaEventsForConsultas(consultaIds: string[]) {
  const events: ConsultaRecord[] = [];
  const chunks = chunk(consultaIds, 35);

  await mapWithConcurrency(chunks, 4, async (consultaIdChunk) => {
    const filter = consultaIdChunk.map((id) => `consulta_id = "${escapeFilterValue(id)}"`).join(" || ");
    const records = await listAllRecords<ConsultaRecord>("consulta_eventos", filter, "id,consulta_id,paciente_id,tipo,titulo,detalle,metadata,actor_id,actor_nombre,created,updated", true);
    events.push(...records);
  });

  return events;
}

async function listAllRecords<T>(collection: string, filter: string, fields: string, allowMissingCollection = false) {
  const records: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: "500",
      fields,
      filter,
    });

    let result: PocketBaseList<T>;
    try {
      result = (await pbAdmin(`/api/collections/${collection}/records?${params}`)) as PocketBaseList<T>;
    } catch (error) {
      if (allowMissingCollection && error instanceof Error && error.message.startsWith("PocketBase 404:")) {
        return [];
      }
      throw error;
    }

    records.push(...(result.items || []));
    totalPages = result.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return records;
}

async function deleteRecord(collection: string, id: string) {
  await pbAdmin(`/api/collections/${collection}/records/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

async function resolveImportMedicoId(admin: Record<string, unknown>) {
  if (admin.id && normalizeUserRoles(admin).includes("medico")) {
    return String(admin.id);
  }

  const result = (await pbAdmin(
    "/api/collections/users/records?page=1&perPage=200&sort=name,email&fields=id,email,name,role,roles"
  )) as PocketBaseList<UserRecord>;
  const medico = (result.items || []).find((user) => normalizeUserRoles(user).includes("medico"));

  return medico?.id || "";
}

async function getNextAvailableFichaForPatient(patientId: string) {
  const firstCandidate = await getNextFichaNumber();
  const firstNumeric = Number(firstCandidate);

  if (!Number.isFinite(firstNumeric)) {
    const duplicate = await findDuplicateFicha(firstCandidate, patientId);
    if (!duplicate) return firstCandidate;

    throw new Error(`La ficha sugerida ${firstCandidate} ya esta ocupada y no es numerica.`);
  }

  for (let attempt = 0; attempt < MAX_NEXT_FICHA_ATTEMPTS; attempt += 1) {
    const nextFicha = String(firstNumeric + attempt);
    const duplicate = await findDuplicateFicha(nextFicha, patientId);
    if (!duplicate) return nextFicha;
  }

  throw new Error(`No se pudo obtener una ficha disponible desde ${firstCandidate} despues de ${MAX_NEXT_FICHA_ATTEMPTS} intentos`);
}

async function writeFichaActionBackup(input: {
  action: string;
  patient: Patient;
  ficha: string;
  nextFicha: string;
  adminId: string;
  consultas: ConsultaRecord[];
  consultaEventos: ConsultaRecord[];
  datomedRows: number;
}) {
  try {
    const backupDir = path.join(process.cwd(), "data", "backups", `fichas-duplicadas-${input.action}`);
    await fs.mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `${stamp}-paciente-${safeFilePart(input.patient.id)}-ficha-${safeFilePart(input.ficha)}.json`);
    await fs.writeFile(
      backupPath,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        action: `fichas-duplicadas-${input.action}`,
        adminId: input.adminId,
        patient: input.patient,
        fichaOrigen: input.ficha,
        fichaDestino: input.nextFicha,
        datomedRows: input.datomedRows,
        consultas: input.consultas,
        consultaEventos: input.consultaEventos,
      }, null, 2),
      "utf8"
    );
    return { path: backupPath, error: "" };
  } catch (error) {
    console.error(`No se pudo escribir backup de ${input.action}:`, error);
    return { path: "", error: error instanceof Error ? error.message : "No se pudo escribir backup" };
  }
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function normalizeFicha(value: string | undefined) {
  return String(value || "").trim();
}

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
