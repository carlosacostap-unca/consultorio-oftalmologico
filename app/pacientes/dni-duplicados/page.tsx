"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACTIVE_ROLE_CHANGED_EVENT, activeRoleJsonHeaders, canUseAdminFeatures, resolveActiveRole } from "@/lib/active-role";
import { pb } from "@/lib/pocketbase";
import type { UserRole } from "@/lib/permissions";
import type { AppUser } from "@/lib/types";

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

interface DuplicateDocumentsResponse {
  groups?: DuplicateDocumentGroup[];
  totalGroups?: number;
  totalPatients?: number;
  totalFichas?: number;
  error?: string;
}

const DOCUMENTS_PER_PAGE = 8;

export default function DniDuplicadosPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [groups, setGroups] = useState<DuplicateDocumentGroup[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalFichas, setTotalFichas] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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

  const loadDuplicateDocuments = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pacientes/dni-duplicados", {
        headers: requestHeaders,
      });
      const data = (await response.json()) as DuplicateDocumentsResponse;
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar DNI duplicados");

      setGroups(data.groups || []);
      setTotalPatients(data.totalPatients || 0);
      setTotalFichas(data.totalFichas || 0);
      setCurrentPage(1);
    } catch (loadError) {
      console.error("Error al cargar DNI duplicados:", loadError);
      setGroups([]);
      setTotalPatients(0);
      setTotalFichas(0);
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar DNI duplicados");
    } finally {
      setIsLoading(false);
    }
  }, [requestHeaders]);

  useEffect(() => {
    if (!isMounted || !pb.authStore.isValid || !canUsePage) return;
    loadDuplicateDocuments();
  }, [canUsePage, isMounted, loadDuplicateDocuments]);

  const totalPages = Math.max(Math.ceil(groups.length / DOCUMENTS_PER_PAGE), 1);
  const pageStart = (currentPage - 1) * DOCUMENTS_PER_PAGE;
  const paginatedGroups = groups.slice(pageStart, pageStart + DOCUMENTS_PER_PAGE);
  const visibleStart = groups.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageStart + paginatedGroups.length, groups.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

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
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">DNI duplicados</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Documentos presentes en mas de una ficha activa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[28rem]">
            <SummaryCard label="DNI" value={groups.length} />
            <SummaryCard label="Fichas" value={totalFichas} />
            <SummaryCard label="Pacientes" value={totalPatients} />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando DNI duplicados...</p>
          ) : groups.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No hay DNI duplicados para revisar</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                No se encontraron documentos activos presentes en mas de una ficha.
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
                <DuplicateDocumentGroupCard key={group.documento} group={group} />
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

function DuplicateDocumentGroupCard({ group }: { group: DuplicateDocumentGroup }) {
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">DNI</div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{group.documento}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{group.fichaCount} fichas</Badge>
          <Badge>{group.patientCount} pacientes</Badge>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-100 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Documento cargado</th>
              <th className="px-4 py-3">Ficha</th>
              <th className="px-4 py-3">Telefono</th>
              <th className="px-4 py-3">Obra social</th>
              <th className="px-4 py-3 text-right">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {group.patients.map((patient) => (
              <tr key={patient.id} className="bg-white dark:bg-zinc-950/30">
                <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{patient.label}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{patient.document || "-"}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{patient.numero_ficha || "-"}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{patient.telefono || "-"}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{patient.obra_social || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/pacientes/${patient.id}?mode=view`}
                    className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/60"
                  >
                    Ver ficha
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
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
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/60 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-zinc-600 dark:text-zinc-400">
        Mostrando {visibleStart}-{visibleEnd} de {totalItems} DNI duplicados
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage <= 1}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Anterior
        </button>
        <span className="min-w-24 text-center text-zinc-600 dark:text-zinc-400">
          Pagina {currentPage} de {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
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

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
      {children}
    </span>
  );
}
