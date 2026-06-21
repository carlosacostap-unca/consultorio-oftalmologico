"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACTIVE_ROLE_CHANGED_EVENT, activeRoleJsonHeaders, canUseAdminFeatures, resolveActiveRole } from "@/lib/active-role";
import { pb } from "@/lib/pocketbase";
import type { UserRole } from "@/lib/permissions";
import type { AppUser } from "@/lib/types";

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

interface DuplicateFichasResponse {
  groups?: DuplicateFichaGroup[];
  totalGroups?: number;
  totalPatients?: number;
  error?: string;
}

interface QuedaResponse {
  ok?: boolean;
  action?: string;
  ficha?: string;
  previousFicha?: string;
  deletedConsultas?: number;
  importedConsultas?: number;
  backupPath?: string;
  backupError?: string;
  message?: string;
  error?: string;
}

const FICHAS_PER_PAGE = 5;

export default function FichasDuplicadasPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [groups, setGroups] = useState<DuplicateFichaGroup[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPatientId, setProcessingPatientId] = useState("");
  const [processingAction, setProcessingAction] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsMounted(true);
    const applyUser = () => {
      const authUser = pb.authStore.record as AppUser | null;
      const resolvedRole = resolveActiveRole(authUser, ["secretaria"]);
      setUser(authUser);
      setActiveRole(resolvedRole);
      if (!pb.authStore.isValid) {
        router.push("/");
      }
    };

    applyUser();
    window.addEventListener(ACTIVE_ROLE_CHANGED_EVENT, applyUser);
    return () => window.removeEventListener(ACTIVE_ROLE_CHANGED_EVENT, applyUser);
  }, [router]);

  const canUsePage = canUseAdminFeatures(user, activeRole);
  const requestHeaders = useMemo(() => activeRoleJsonHeaders(pb.authStore.token, activeRole), [activeRole]);

  const loadDuplicateFichas = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pacientes/fichas-duplicadas", {
        headers: requestHeaders,
      });
      const data = (await response.json()) as DuplicateFichasResponse;
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar fichas duplicadas");

      setGroups(data.groups || []);
      setTotalPatients(data.totalPatients || 0);
      setCurrentPage(1);
    } catch (loadError) {
      console.error("Error al cargar fichas duplicadas:", loadError);
      setGroups([]);
      setTotalPatients(0);
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar fichas duplicadas");
    } finally {
      setIsLoading(false);
    }
  }, [requestHeaders]);

  useEffect(() => {
    if (!isMounted || !pb.authStore.isValid || !canUsePage) return;
    loadDuplicateFichas();
  }, [canUsePage, isMounted, loadDuplicateFichas]);

  const totalPages = Math.max(Math.ceil(groups.length / FICHAS_PER_PAGE), 1);
  const pageStart = (currentPage - 1) * FICHAS_PER_PAGE;
  const paginatedGroups = groups.slice(pageStart, pageStart + FICHAS_PER_PAGE);
  const visibleStart = groups.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageStart + paginatedGroups.length, groups.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const keepPatientConsultas = async (patient: DuplicateFichaPatient) => {
    await runFichaAction(patient, "queda");
  };

  const separatePatientConsultas = async (patient: DuplicateFichaPatient) => {
    await runFichaAction(patient, "separar");
  };

  const runFichaAction = async (patient: DuplicateFichaPatient, action: "queda" | "separar") => {
    if (processingPatientId) return;

    const confirmationWord = action === "separar" ? "SEPARAR" : "QUEDA";
    const actionLabel = action === "separar" ? "SEPARAR" : "QUEDA";
    const details = action === "separar"
      ? `Se eliminaran sus ${patient.consultasCount} consultas actuales, se importaran copias desde DATOMED.DBF para la ficha ${patient.numero_ficha}, se generara una ficha nueva disponible y las copias quedaran con esa nueva ficha.`
      : `Se eliminaran sus ${patient.consultasCount} consultas actuales y se importaran las consultas de DATOMED.DBF para la ficha ${patient.numero_ficha}.`;
    const confirmed = window.confirm(
      `Confirmar ${actionLabel} para ${patient.label}.\n\n${details}\n\nEsta accion modifica datos clinicos.`
    );
    if (!confirmed) return;

    setProcessingPatientId(patient.id);
    setProcessingAction(action);
    setError("");
    setResult("");
    try {
      const response = await fetch("/api/pacientes/fichas-duplicadas", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          action,
          patientId: patient.id,
          confirmation: confirmationWord,
        }),
      });
      const data = (await response.json()) as QuedaResponse;
      if (!response.ok) throw new Error(data.error || "No se pudo importar desde DATOMED");

      const backupText = data.backupPath ? ` Backup: ${data.backupPath}` : "";
      const backupWarning = data.backupError ? ` No se pudo escribir backup: ${data.backupError}` : "";
      const fichaText = action === "separar" && data.ficha
        ? ` Nueva ficha: ${data.ficha}.`
        : "";
      setResult(`Se eliminaron ${data.deletedConsultas || 0} consultas y se importaron ${data.importedConsultas || 0}.${fichaText}${backupText}${backupWarning}`);
      await loadDuplicateFichas();
    } catch (actionError) {
      console.error(`Error al ejecutar ${action}:`, actionError);
      setError(actionError instanceof Error ? actionError.message : "No se pudo importar desde DATOMED");
    } finally {
      setProcessingPatientId("");
      setProcessingAction("");
    }
  };

  if (!isMounted) return null;

  if (!canUsePage) {
    return (
      <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No autorizado</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Esta pantalla requiere rol activo admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-zinc-200 bg-white p-2 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              aria-label="Volver"
            >
              <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Calidad de datos</p>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Fichas duplicadas</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Fichas clinicas con mas de un paciente activo asignado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-72">
            <SummaryCard label="Fichas" value={groups.length} />
            <SummaryCard label="Pacientes" value={totalPatients} />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        {result && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
            {result}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando fichas duplicadas...</p>
          ) : groups.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No hay fichas duplicadas para revisar</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                No se encontraron fichas activas compartidas por mas de un paciente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                visibleStart={visibleStart}
                visibleEnd={visibleEnd}
                totalItems={groups.length}
                onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              />

              {paginatedGroups.map((group) => (
                <DuplicateFichaGroupCard
                  key={group.ficha}
                  group={group}
                  processingPatientId={processingPatientId}
                  processingAction={processingAction}
                  onKeepPatient={keepPatientConsultas}
                  onSeparatePatient={separatePatientConsultas}
                />
              ))}

              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                visibleStart={visibleStart}
                visibleEnd={visibleEnd}
                totalItems={groups.length}
                onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PaginationBar({
  currentPage,
  totalPages,
  visibleStart,
  visibleEnd,
  totalItems,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  visibleStart: number;
  visibleEnd: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-zinc-600 dark:text-zinc-300">
        Mostrando {visibleStart}-{visibleEnd} de {totalItems} fichas
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage <= 1}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Anterior
        </button>
        <span className="min-w-20 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function DuplicateFichaGroupCard({
  group,
  processingPatientId,
  processingAction,
  onKeepPatient,
  onSeparatePatient,
}: {
  group: DuplicateFichaGroup;
  processingPatientId: string;
  processingAction: string;
  onKeepPatient: (patient: DuplicateFichaPatient) => void;
  onSeparatePatient: (patient: DuplicateFichaPatient) => void;
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">
            <Link
              href={`/pacientes/fichas-duplicadas/${encodeURIComponent(group.ficha)}`}
              className="text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Ficha {group.ficha}
            </Link>
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {group.patientCount} pacientes activos con esta ficha.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="hidden grid-cols-[minmax(190px,1.2fr)_minmax(100px,0.6fr)_minmax(105px,0.7fr)_minmax(120px,0.8fr)_65px_78px_150px] gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 lg:grid">
          <div>Paciente</div>
          <div>Documento</div>
          <div>Telefono</div>
          <div>Obra social</div>
          <div>Ficha</div>
          <div className="text-right">Consultas</div>
          <div className="text-right">Acciones</div>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {group.patients.map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              processingAction={processingPatientId === patient.id ? processingAction : ""}
              isAnyProcessing={Boolean(processingPatientId)}
              onKeep={() => onKeepPatient(patient)}
              onSeparate={() => onSeparatePatient(patient)}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function PatientRow({
  patient,
  processingAction,
  isAnyProcessing,
  onKeep,
  onSeparate,
}: {
  patient: DuplicateFichaPatient;
  processingAction: string;
  isAnyProcessing: boolean;
  onKeep: () => void;
  onSeparate: () => void;
}) {
  return (
    <div className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[minmax(190px,1.2fr)_minmax(100px,0.6fr)_minmax(105px,0.7fr)_minmax(120px,0.8fr)_65px_78px_150px] lg:items-center">
      <div>
        <Link href={`/pacientes/${patient.id}?mode=view`} className="font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
          {patient.label}
        </Link>
        {patient.email && <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{patient.email}</div>}
      </div>
      <Field label="Documento" value={patient.document || "-"} />
      <Field label="Telefono" value={patient.telefono || "-"} />
      <Field label="Obra social" value={patient.obra_social || "-"} />
      <Field label="Ficha" value={patient.numero_ficha || "-"} />
      <Field label="Consultas" value={String(patient.consultasCount || 0)} align="right" />
      <div className="lg:text-right">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 lg:hidden">Acciones</div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onKeep}
            disabled={isAnyProcessing}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
          >
            {processingAction === "queda" ? "Procesando..." : "Queda"}
          </button>
          <button
            type="button"
            onClick={onSeparate}
            disabled={isAnyProcessing}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/40"
          >
            {processingAction === "separar" ? "Procesando..." : "Separar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, align = "left" }: { label: string; value: string; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "lg:text-right" : undefined}>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 lg:hidden">{label}</div>
      <div className="text-zinc-700 dark:text-zinc-300">{value}</div>
    </div>
  );
}
