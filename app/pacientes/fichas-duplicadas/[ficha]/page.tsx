"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
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

interface FichaDetailResponse {
  group?: DuplicateFichaGroup;
  totalPatients?: number;
  totalConsultas?: number;
  error?: string;
}

interface FichaActionResponse {
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

export default function FichaDuplicadaDetallePage({ params }: { params: Promise<{ ficha: string }> }) {
  const { ficha } = use(params);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [group, setGroup] = useState<DuplicateFichaGroup | null>(null);
  const [totalConsultas, setTotalConsultas] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPatientId, setProcessingPatientId] = useState("");
  const [processingAction, setProcessingAction] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

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

  const loadFicha = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/pacientes/fichas-duplicadas?ficha=${encodeURIComponent(ficha)}`, {
        headers: requestHeaders,
      });
      const data = (await response.json()) as FichaDetailResponse;
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el detalle de la ficha");

      setGroup(data.group || null);
      setTotalConsultas(data.totalConsultas || 0);
    } catch (loadError) {
      console.error("Error al cargar detalle de ficha:", loadError);
      setGroup(null);
      setTotalConsultas(0);
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el detalle de la ficha");
    } finally {
      setIsLoading(false);
    }
  }, [ficha, requestHeaders]);

  useEffect(() => {
    if (!isMounted || !pb.authStore.isValid || !canUsePage) return;
    loadFicha();
  }, [canUsePage, isMounted, loadFicha]);

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
      const data = (await response.json()) as FichaActionResponse;
      if (!response.ok) throw new Error(data.error || "No se pudo importar desde DATOMED");

      const backupText = data.backupPath ? ` Backup: ${data.backupPath}` : "";
      const backupWarning = data.backupError ? ` No se pudo escribir backup: ${data.backupError}` : "";
      const fichaText = action === "separar" && data.ficha
        ? ` Nueva ficha: ${data.ficha}.`
        : "";
      setResult(`Se eliminaron ${data.deletedConsultas || 0} consultas y se importaron ${data.importedConsultas || 0}.${fichaText}${backupText}${backupWarning}`);
      await loadFicha();
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
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Ficha {ficha}</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Detalle de pacientes activos asociados a esta ficha clinica.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-72">
            <SummaryCard label="Pacientes" value={group?.patientCount || 0} />
            <SummaryCard label="Consultas" value={totalConsultas} />
          </div>
        </div>

        <div className="mb-4">
          <Link
            href="/pacientes/fichas-duplicadas"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Volver a fichas duplicadas
          </Link>
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
            <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando detalle de ficha...</p>
          ) : !group ? (
            <div className="py-16 text-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No se encontro la ficha</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                No hay pacientes activos asociados a la ficha solicitada.
              </p>
            </div>
          ) : (
            <FichaPatientTable
              patients={group.patients}
              processingPatientId={processingPatientId}
              processingAction={processingAction}
              onKeepPatient={keepPatientConsultas}
              onSeparatePatient={separatePatientConsultas}
            />
          )}
        </section>
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

function FichaPatientTable({
  patients,
  processingPatientId,
  processingAction,
  onKeepPatient,
  onSeparatePatient,
}: {
  patients: DuplicateFichaPatient[];
  processingPatientId: string;
  processingAction: string;
  onKeepPatient: (patient: DuplicateFichaPatient) => void;
  onSeparatePatient: (patient: DuplicateFichaPatient) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
        {patients.map((patient) => (
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
