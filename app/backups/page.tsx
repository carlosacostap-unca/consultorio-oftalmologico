"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ACTIVE_ROLE_CHANGED_EVENT, canUseAdminFeatures, getValidStoredActiveRole } from "@/lib/active-role";
import { pb } from "@/lib/pocketbase";
import { BackupClientError, requestBackups } from "@/lib/backups/client";
import type { BackupItem } from "@/lib/backups/service";

function isAdmin() {
  return pb.authStore.isValid && canUseAdminFeatures(pb.authStore.record, getValidStoredActiveRole(pb.authStore.record));
}

function sizeLabel(bytes: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) + " MB";
}

export default function BackupsPage() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BackupItem[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [downloadsEnabled, setDownloadsEnabled] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const epoch = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++epoch.current;
    const token = pb.authStore.token;
    const admin = isAdmin();
    setReady(true);
    setAllowed(admin);
    setOnline(navigator.onLine);
    setItems([]);
    setError("");
    setNotice("");
    setBusyKey(null);
    setDownloadsEnabled(false);
    setLimit(null);
    setLoading(admin && navigator.onLine);
    if (!admin || !navigator.onLine) return;
    const current = () => requestId === epoch.current && token === pb.authStore.token && isAdmin();
    try {
      const data = await requestBackups("list");
      if (!current()) return;
      setItems(data.items as BackupItem[]);
      setLimit(typeof data.automaticLimit === "number" ? data.automaticLimit : null);
      setDownloadsEnabled(data.downloadsEnabled === true);
    } catch (cause) {
      if (current()) setError(cause instanceof BackupClientError ? cause.message : "No se pudo consultar el listado. Comprobá tu conexión e intentá nuevamente.");
    } finally {
      if (current()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const reload = () => { void refresh(); };
    const unsubscribe = pb.authStore.onChange(reload, true);
    window.addEventListener(ACTIVE_ROLE_CHANGED_EVENT, reload);
    window.addEventListener("online", reload);
    window.addEventListener("offline", reload);
    return () => {
      // Invalidate the latest request generation, not a captured DOM reference.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++epoch.current;
      unsubscribe();
      window.removeEventListener(ACTIVE_ROLE_CHANGED_EVENT, reload);
      window.removeEventListener("online", reload);
      window.removeEventListener("offline", reload);
    };
  }, [refresh]);

  async function download(item: BackupItem) {
    const requestId = epoch.current;
    const token = pb.authStore.token;
    const current = () => requestId === epoch.current && token === pb.authStore.token && isAdmin();
    setBusyKey(item.key);
    setError("");
    setNotice("");
    try {
      const data = await requestBackups("download", item.key);
      if (!current()) return;
      const url = new URL(String(data.url));
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("URL inválida");
      const link = document.createElement("a");
      link.href = url.href;
      link.download = item.key;
      link.referrerPolicy = "no-referrer";
      document.body.append(link);
      link.click();
      link.remove();
      setNotice(`Descarga solicitada: ${item.key}. Revisá las descargas para ver su progreso.`);
    } catch (cause) {
      if (!current()) return;
      if (cause instanceof BackupClientError && cause.status === 403) setItems([]);
      setError(cause instanceof BackupClientError ? cause.message : "No se pudo iniciar la descarga. Comprobá tu conexión e intentá nuevamente.");
    } finally {
      if (current()) setBusyKey(null);
    }
  }

  if (!ready) return <p className="p-8 text-sm text-zinc-500" role="status">Cargando backups…</p>;
  if (!allowed) return (
    <section className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">Acceso exclusivo para administradores</h1>
      <p className="mt-3 text-sm text-zinc-500">Iniciá sesión y seleccioná el rol Admin para consultar los backups.</p>
      <Link href="/" className="mt-6 inline-block text-blue-600 underline">Volver al inicio</Link>
    </section>
  );

  return (
    <div className="min-h-full bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-8">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Administración</p>
            <h1 className="mt-1 text-3xl font-bold">Backups de la base de datos</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Descargá una copia de seguridad de la base central desde el almacenamiento.</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading || busyKey !== null} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">{loading ? "Actualizando…" : "Actualizar listado"}</button>
        </div>
        {limit !== null && <p className="mt-5 text-sm text-zinc-500">Se conservan hasta {limit} backups automáticos. También se muestran las copias manuales disponibles.</p>}
        {!online && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Necesitás conexión a Internet para consultar y descargar los backups centrales.</p>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{notice}</p>}
        {online && !loading && !error && !downloadsEnabled && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">La descarga todavía no está habilitada. Contactá al administrador del servidor.</p>}
        {loading ? <p role="status" className="mt-8 text-sm text-zinc-500">Consultando backups disponibles…</p> : online && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <caption className="border-b border-zinc-200 px-5 py-4 text-left font-semibold dark:border-zinc-800">{items.length} backups disponibles</caption>
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950"><tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Archivo</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Tamaño</th><th className="px-5 py-3"><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map((item) => <tr key={item.key}>
                  <td className="whitespace-nowrap px-5 py-4"><time dateTime={item.modified}>{new Date(item.modified).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</time></td>
                  <td className="min-w-56 break-all px-5 py-4 font-medium">{item.key}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs dark:bg-zinc-800">{item.automatic ? "Automático" : "Manual"}</span></td>
                  <td className="whitespace-nowrap px-5 py-4">{sizeLabel(item.size)}</td>
                  <td className="px-5 py-4 text-right"><button type="button" aria-label={`Descargar ${item.key}`} disabled={!downloadsEnabled || busyKey !== null} onClick={() => void download(item)} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{busyKey === item.key ? "Preparando…" : "Descargar"}</button></td>
                </tr>)}
                {items.length === 0 && !error && <tr><td colSpan={5} className="px-5 py-12 text-center text-zinc-500">Todavía no hay backups disponibles.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
