"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACTIVE_ROLE_CHANGED_EVENT, activeRoleJsonHeaders, canUseAdminFeatures, resolveActiveRole } from "@/lib/active-role";
import { pb } from "@/lib/pocketbase";
import { patientDisplayName, patientDocument } from "@/lib/patient-merge";
import type { AppUser, Patient } from "@/lib/types";
import type { UserRole } from "@/lib/permissions";

interface Counts {
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
  counts: Counts;
  recent?: RecentActivity;
}

interface CandidateGroup {
  reason: string;
  patients: Array<{
    id: string;
    label: string;
    document: string;
    telefono: string;
    numero_ficha: string;
  }>;
}

interface DuplicateResponse {
  patients?: PatientSummary[];
  candidateGroups?: CandidateGroup[];
  comparison?: {
    primary: PatientSummary;
    duplicate: PatientSummary;
  };
}

interface MergeResult {
  ok: boolean;
  primaryPatient: Patient;
  duplicatePatient: Patient;
  counts: Counts;
  message: string;
}

export default function PacientesDuplicadosPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [candidateGroups, setCandidateGroups] = useState<CandidateGroup[]>([]);
  const [primaryId, setPrimaryId] = useState("");
  const [duplicateId, setDuplicateId] = useState("");
  const [comparison, setComparison] = useState<DuplicateResponse["comparison"] | null>(null);
  const [motivo, setMotivo] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MergeResult | null>(null);

  useEffect(() => {
    const handler = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(handler);
  }, [search]);

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

  useEffect(() => {
    if (!isMounted || !pb.authStore.isValid || !canUsePage) return;

    const loadPatients = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
        const response = await fetch(`/api/pacientes/duplicados?${params}`, {
          headers: requestHeaders,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar duplicados");
        setPatients(data.patients || []);
        setCandidateGroups(data.candidateGroups || []);
      } catch (loadError) {
        console.error("Error al cargar duplicados:", loadError);
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar duplicados");
      } finally {
        setIsLoading(false);
      }
    };

    loadPatients();
  }, [canUsePage, debouncedSearch, isMounted, requestHeaders]);

  useEffect(() => {
    if (!primaryId || !duplicateId || primaryId === duplicateId || !canUsePage) {
      setComparison(null);
      return;
    }

    const loadComparison = async () => {
      setIsComparing(true);
      setError("");
      try {
        const params = new URLSearchParams({ primaryId, duplicateId });
        const response = await fetch(`/api/pacientes/duplicados?${params}`, { headers: requestHeaders });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo comparar pacientes");
        setComparison(data.comparison);
      } catch (compareError) {
        console.error("Error al comparar pacientes:", compareError);
        setComparison(null);
        setError(compareError instanceof Error ? compareError.message : "No se pudo comparar pacientes");
      } finally {
        setIsComparing(false);
      }
    };

    loadComparison();
  }, [canUsePage, duplicateId, primaryId, requestHeaders]);

  const selectedPrimary = comparison?.primary || patients.find((item) => item.patient.id === primaryId) || null;
  const selectedDuplicate = comparison?.duplicate || patients.find((item) => item.patient.id === duplicateId) || null;
  const canMerge = Boolean(comparison && primaryId && duplicateId && primaryId !== duplicateId && confirmation.trim().toUpperCase() === "FUSIONAR");

  const mergePatients = async () => {
    if (!canMerge) return;

    setIsMerging(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/pacientes/duplicados", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          primaryPatientId: primaryId,
          duplicatePatientId: duplicateId,
          motivo,
          confirmation,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo fusionar pacientes");
      setResult(data);
      setConfirmation("");
      setComparison(null);
      setDuplicateId("");
    } catch (mergeError) {
      console.error("Error al fusionar pacientes:", mergeError);
      setError(mergeError instanceof Error ? mergeError.message : "No se pudo fusionar pacientes");
    } finally {
      setIsMerging(false);
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
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Duplicados de pacientes</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Compara pacientes y fusiona referencias clinicas con trazabilidad.</p>
            </div>
          </div>
          <Link href="/pacientes" className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Ver pacientes
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200">
            <div className="font-semibold">{result.message}</div>
            <div className="mt-1">
              Reasignados: {result.counts.turnos} turnos, {result.counts.consultas} consultas, {result.counts.recetas} recetas.
            </div>
            <Link href={`/pacientes/${result.primaryPatient.id}?mode=view`} className="mt-2 inline-block font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
              Abrir ficha principal
            </Link>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Buscar paciente
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, apellido, DNI, telefono o ficha"
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <div className="mt-4 space-y-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pacientes activos</h2>
              {isLoading ? (
                <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando pacientes...</p>
              ) : patients.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No hay coincidencias.</p>
              ) : patients.map((item) => (
                <PatientSelector
                  key={item.patient.id}
                  summary={item}
                  primaryId={primaryId}
                  duplicateId={duplicateId}
                  onPrimary={() => setPrimaryId(item.patient.id)}
                  onDuplicate={() => setDuplicateId(item.patient.id)}
                />
              ))}
            </div>

            {!search && candidateGroups.length > 0 && (
              <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sugerencias</h2>
                <div className="mt-2 space-y-2">
                  {candidateGroups.map((group, index) => (
                    <div key={`${group.reason}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/60 dark:bg-amber-900/20">
                      <div className="font-semibold text-amber-900 dark:text-amber-100">{group.reason}</div>
                      <div className="mt-1 space-y-1 text-xs text-amber-800 dark:text-amber-200">
                        {group.patients.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => {
                              if (!primaryId) setPrimaryId(patient.id);
                              else setDuplicateId(patient.id);
                            }}
                            className="block text-left font-medium hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            {patient.label} {patient.document ? `- DNI ${patient.document}` : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Comparacion</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">El paciente duplicado se archivara y sus referencias pasaran al principal.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryId(duplicateId);
                    setDuplicateId(primaryId);
                  }}
                  disabled={!primaryId || !duplicateId}
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Intercambiar
                </button>
              </div>

              {isComparing ? (
                <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">Comparando pacientes...</p>
              ) : !selectedPrimary || !selectedDuplicate ? (
                <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">Selecciona un paciente principal y uno duplicado.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <PatientComparisonCard title="Paciente principal" summary={selectedPrimary} accent="blue" />
                  <PatientComparisonCard title="Paciente duplicado" summary={selectedDuplicate} accent="amber" />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Confirmar fusion</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Escribi FUSIONAR para mover turnos, consultas y recetas al paciente principal.
              </p>
              <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Motivo
                <input
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder="Ej: Registro duplicado por mismo DNI"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Confirmacion
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="FUSIONAR"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <button
                type="button"
                onClick={mergePatients}
                disabled={!canMerge || isMerging}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMerging ? "Fusionando..." : "Fusionar pacientes"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PatientSelector({
  summary,
  primaryId,
  duplicateId,
  onPrimary,
  onDuplicate,
}: {
  summary: PatientSummary;
  primaryId: string;
  duplicateId: string;
  onPrimary: () => void;
  onDuplicate: () => void;
}) {
  const { patient, counts } = summary;
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{patientDisplayName(patient)}</div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {[patientDocument(patient) ? `DNI ${patientDocument(patient)}` : "", patient.telefono ? `Tel ${patient.telefono}` : "", patient.numero_ficha ? `Ficha ${patient.numero_ficha}` : ""].filter(Boolean).join(" - ") || "Sin datos administrativos"}
      </div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {counts.turnos} turnos - {counts.consultas} consultas - {counts.recetas} recetas
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onPrimary}
          disabled={duplicateId === patient.id}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${primaryId === patient.id ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300"} disabled:opacity-40`}
        >
          Principal
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={primaryId === patient.id}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${duplicateId === patient.id ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-200"} disabled:opacity-40`}
        >
          Duplicado
        </button>
      </div>
    </div>
  );
}

function PatientComparisonCard({ title, summary, accent }: { title: string; summary: PatientSummary; accent: "blue" | "amber" }) {
  const { patient, counts } = summary;
  const accentClass = accent === "blue"
    ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-100"
    : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100";

  return (
    <div className={`rounded-xl border p-4 ${accentClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide">{title}</div>
      <div className="mt-2 text-lg font-bold">{patientDisplayName(patient)}</div>
      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Documento" value={patientDocument(patient) || "-"} />
        <Row label="Telefono" value={patient.telefono || "-"} />
        <Row label="Ficha" value={patient.numero_ficha || "-"} />
        <Row label="Obra social" value={patient.obra_social || "-"} />
        <Row label="Email" value={patient.email || "-"} />
      </dl>
      <div className="mt-4 rounded-lg bg-white/70 p-3 text-sm dark:bg-zinc-950/40">
        {counts.turnos} turnos - {counts.consultas} consultas - {counts.recetas} recetas
      </div>
      <div className="mt-4 space-y-3">
        <ActivityList
          title="Ultimos turnos"
          items={(summary.recent?.turnos || []).map((turno) => ({
            id: turno.id,
            date: turno.fecha_hora,
            primary: turno.motivo || "Turno sin motivo",
            secondary: [turno.tipo, turno.estado].filter(Boolean).join(" - "),
          }))}
        />
        <ActivityList
          title="Ultimas consultas"
          items={(summary.recent?.consultas || []).map((consulta) => ({
            id: consulta.id,
            date: consulta.fecha,
            primary: consulta.motivo_consulta || "Consulta sin motivo",
            secondary: consulta.diagnostico || "",
          }))}
        />
        <ActivityList
          title="Ultimas recetas"
          items={(summary.recent?.recetas || []).map((receta) => ({
            id: receta.id,
            date: receta.fecha,
            primary: receta.medicamentos || "Receta sin medicamentos",
            secondary: receta.indicaciones || "",
          }))}
        />
      </div>
      <Link href={`/pacientes/${patient.id}?mode=view`} className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">
        Ver ficha
      </Link>
    </div>
  );
}

function ActivityList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; date?: string; primary: string; secondary?: string }>;
}) {
  return (
    <div className="rounded-lg bg-white/60 p-3 dark:bg-zinc-950/30">
      <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{title}</div>
      {items.length === 0 ? (
        <div className="mt-2 text-xs opacity-70">Sin registros recientes.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="text-xs">
              <div className="font-semibold">{formatActivityDate(item.date)} - {item.primary}</div>
              {item.secondary && <div className="mt-0.5 truncate opacity-75" title={item.secondary}>{item.secondary}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatActivityDate(value?: string) {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  } catch {
    return "Sin fecha";
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="font-medium opacity-75">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
