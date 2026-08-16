"use client";

import { useCallback, useEffect, useState } from "react";
import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import {
  DESKTOP_SYNC_STATUS_EVENT,
  getDesktopSyncStatus,
  resolveDesktopConflict,
  runDesktopSync,
} from "@/lib/desktop-sync/engine";
import { sanitizeSyncError } from "@/lib/desktop-sync/core";
import { presentSyncStatus } from "@/lib/desktop-sync/status-presentation";
import { presentConflict } from "@/lib/desktop-sync/conflict-presentation";
import type { SyncStatusSnapshot } from "@/lib/desktop-sync/types";

export default function SynchronizationPage() {
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null);
  const [operations, setOperations] = useState<RecordModel[]>([]);
  const [conflicts, setConflicts] = useState<RecordModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [resolvingId, setResolvingId] = useState("");
  const [patientIds, setPatientIds] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!window.consultorioDesktop || !pb.authStore.isValid) {
      setLoading(false);
      return;
    }
    setLoadError("");
    try {
      const [nextStatus, nextOperations, nextConflicts] = await Promise.all([
        getDesktopSyncStatus(),
        pb.collection("sync_operations").getFullList({ filter: 'status != "confirmed"', sort: "-queued_at", requestKey: null }),
        pb.collection("sync_local_conflicts").getFullList({ filter: 'status = "open"', requestKey: null }),
      ]);
      setStatus(nextStatus);
      setOperations(nextOperations);
      setConflicts(nextConflicts);
    } catch (error) {
      setLoadError(`No se pudo cargar el estado local: ${sanitizeSyncError(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const update = () => void refresh();
    window.addEventListener(DESKTOP_SYNC_STATUS_EVENT, update);
    return () => window.removeEventListener(DESKTOP_SYNC_STATUS_EVENT, update);
  }, [refresh]);

  async function synchronizeNow() {
    setMessage("");
    const result = await runDesktopSync();
    setMessage(
      result.lastError
        ? `No se pudo completar: ${result.lastError}`
        : result.phase === "continuation_required"
          ? "La descarga continúa automáticamente."
          : "Sincronización completada.",
    );
    await refresh();
  }

  async function exportDiagnostics() {
    const reportPath = await window.consultorioDesktop!.diagnostics.export();
    setMessage(`Diagnóstico sanitizado generado en ${reportPath}`);
  }

  async function resolveConflict(item: RecordModel, resolution: "keep_central" | "apply_local" | "link_patient") {
    setResolvingId(item.id);
    setMessage("");
    try {
      await resolveDesktopConflict(item, resolution, patientIds[item.id] || "");
      setMessage("Conflicto resuelto y copia local actualizada.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo resolver el conflicto.");
    } finally {
      setResolvingId("");
    }
  }

  if (loading) return <div className="p-8 text-zinc-500">Cargando estado de sincronización...</div>;
  if (!window.consultorioDesktop) return <div className="p-8"><h1 className="text-2xl font-bold">Sincronización</h1><p className="mt-2 text-zinc-500">Esta pantalla está disponible en la versión de escritorio.</p></div>;
  const presentation = status ? presentSyncStatus(status) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Versión de escritorio</p>
          <h1 className="text-3xl font-bold">Sincronización</h1>
          <p className="mt-1 text-zinc-500">Equipo {window.consultorioDesktop.runtime.deviceCode}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportDiagnostics} className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Exportar diagnóstico</button>
          <button type="button" onClick={() => void window.consultorioDesktop?.diagnostics.openFolder()} className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Abrir diagnósticos</button>
          <button type="button" onClick={synchronizeNow} disabled={status?.running} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{status?.running ? "Sincronizando..." : "Sincronizar ahora"}</button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Conexión" value={status?.connectivity === "online" ? "En línea" : status?.connectivity === "offline" ? "Sin conexión" : "Comprobando"} tone={status?.connectivity === "online" ? "green" : "gray"} />
        <Metric label="Pendientes" value={String(status?.pending || 0)} tone="blue" />
        <Metric label="Errores" value={String(status?.errors || 0)} tone={status?.errors ? "amber" : "gray"} />
        <Metric label="Conflictos" value={String(status?.conflicts || 0)} tone={status?.conflicts ? "amber" : "gray"} />
      </section>

      {presentation?.active && (
        <section aria-live="polite" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
          <strong className="block">{presentation.label}</strong>
          <span className="mt-1 block text-sm">{presentation.detail}</span>
        </section>
      )}

      {(loadError || message || status?.lastError) && (
        <div aria-live="polite" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError || message || status?.lastError}</span>
          {loadError && (
            <button type="button" onClick={() => void refresh()} className="rounded-lg border border-amber-300 px-3 py-2 font-semibold hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40">
              Reintentar
            </button>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold">Actividad pendiente</h2>
        <p className="mb-4 text-sm text-zinc-500">No se muestra contenido clínico narrativo en este resumen.</p>
        {operations.length === 0 ? <Empty text="No hay operaciones pendientes." /> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-zinc-500"><tr><th className="pb-2">Entidad</th><th className="pb-2">Acción</th><th className="pb-2">Estado</th><th className="pb-2">Intentos</th><th className="pb-2">Creada</th></tr></thead><tbody>{operations.map((item) => <tr key={item.id} className="border-t border-zinc-100 dark:border-zinc-800"><td className="py-3">{item.entity}</td><td>{item.action}</td><td>{item.status}</td><td>{item.attempts || 0}</td><td>{formatDate(item.queued_at)}</td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold">Conflictos abiertos</h2>
        <p className="mb-4 text-sm text-zinc-500">Los conflictos clínicos no se sobrescriben automáticamente.</p>
        {conflicts.length === 0 ? <Empty text="No hay conflictos abiertos." /> : (
          <div className="space-y-3">{conflicts.map((item) => {
            const fields = differingFields(item.local_snapshot, item.central_snapshot);
            const operation = operations.find((candidate) => candidate.operation_id === item.operation_id);
            const conflictPresentation = presentConflict({
              entity: String(item.entity),
              recordId: String(item.record_id),
              operationAction: operation ? String(operation.action) : undefined,
              differingFieldCount: fields.length,
            });
            const busy = resolvingId === item.id;
            return <details key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
              <summary className="cursor-pointer font-semibold text-amber-900 dark:text-amber-200">{conflictPresentation.summary}</summary>
              <p className="mt-3 text-amber-900/80 dark:text-amber-100/80">{conflictPresentation.detail}</p>
              {!conflictPresentation.isDelete && <div className="mt-4 overflow-x-auto rounded-lg bg-white/70 p-3 dark:bg-zinc-950/50">
                <table className="w-full text-left text-xs"><thead><tr className="text-zinc-500"><th className="pb-2">Campo</th><th className="pb-2">Versión local</th><th className="pb-2">Versión central</th></tr></thead><tbody>{fields.map((field) => <tr key={field} className="border-t border-zinc-200/70 dark:border-zinc-800"><td className="py-2 font-medium">{field}</td><td className="max-w-64 break-words pr-3">{displayValue(item.local_snapshot?.[field])}</td><td className="max-w-64 break-words">{displayValue(item.central_snapshot?.[field])}</td></tr>)}</tbody></table>
              </div>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => void resolveConflict(item, "keep_central")} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900">{conflictPresentation.keepCentralLabel}</button>
                <button disabled={busy} onClick={() => void resolveConflict(item, "apply_local")} className="rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">{conflictPresentation.applyLocalLabel}</button>
                {!conflictPresentation.isDelete && item.entity === "pacientes" && <><input value={patientIds[item.id] || ""} onChange={(event) => setPatientIds((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="ID de paciente central" className="min-w-48 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" /><button disabled={busy || !patientIds[item.id]} onClick={() => void resolveConflict(item, "link_patient")} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">Vincular paciente</button></>}
              </div>
            </details>;
          })}</div>
        )}
      </section>

      <footer className="text-sm text-zinc-500">Último intento: {formatDate(status?.lastAttemptAt)} · Último éxito: {formatDate(status?.lastSuccessAt)}</footer>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "blue" | "amber" | "gray" }) {
  const colors = { green: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30", blue: "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/30", amber: "text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30", gray: "text-zinc-700 bg-zinc-100 dark:text-zinc-300 dark:bg-zinc-800" };
  return <div className={`rounded-2xl p-5 ${colors[tone]}`}><span className="text-sm font-medium">{label}</span><strong className="mt-1 block text-2xl">{value}</strong></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl bg-zinc-50 p-5 text-sm text-zinc-500 dark:bg-zinc-950">{text}</div>;
}

function formatDate(value: unknown) {
  if (!value) return "Sin datos";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Sin datos" : date.toLocaleString("es-AR");
}

function differingFields(local: unknown, central: unknown) {
  const localRecord = isRecord(local) ? local : {};
  const centralRecord = isRecord(central) ? central : {};
  const ignored = new Set(["id", "created", "updated", "collectionId", "collectionName", "expand"]);
  return [...new Set([...Object.keys(localRecord), ...Object.keys(centralRecord)])]
    .filter((field) => !ignored.has(field) && !field.startsWith("sync_"))
    .filter((field) => JSON.stringify(localRecord[field] ?? null) !== JSON.stringify(centralRecord[field] ?? null));
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
