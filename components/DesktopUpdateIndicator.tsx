"use client";

import { useEffect, useState } from "react";
import type { DesktopUpdateClientState } from "@/lib/desktop-runtime";

export function DesktopUpdateIndicator({ collapsed }: { collapsed: boolean }) {
  const [state, setState] = useState<DesktopUpdateClientState | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const bridge = window.consultorioDesktop;
    if (!bridge) return;
    void bridge.updates.getState().then(setState).catch(() => undefined);
    return bridge.updates.onState(setState);
  }, []);

  if (!state) return null;

  const run = async (action: "check" | "postpone" | "install") => {
    const bridge = window.consultorioDesktop;
    if (!bridge || busy) return;
    setBusy(true);
    setActionError("");
    try {
      if (action === "check") setState(await bridge.updates.check());
      else if (action === "postpone") setState(await bridge.updates.postpone());
      else await bridge.updates.install();
    } catch {
      setActionError("No se pudo completar la acción. La versión actual continúa disponible.");
    } finally {
      setBusy(false);
    }
  };

  if (collapsed) {
    const attention = !["idle", "checking"].includes(state.status);
    return (
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => void run("check")}
          disabled={busy || state.status === "checking"}
          title={summary(state)}
          aria-label={summary(state)}
          className={`flex h-10 w-full items-center justify-center rounded-xl border text-sm font-bold transition-colors ${attention ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300" : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"}`}
        >
          {state.status === "downloading" ? `${state.percent ?? 0}%` : state.status === "ready" || state.status === "postponed" ? "↑" : "↻"}
        </button>
      </div>
    );
  }

  const ready = state.status === "ready" || state.status === "postponed";
  const mandatory = state.kind === "mandatory";
  return (
    <div className="px-4 pb-3">
      <div className={`rounded-xl border px-3 py-3 text-sm ${mandatory ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" : "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100"}`}>
        <strong className="block">{summary(state)}</strong>
        {state.status === "downloading" && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${state.percent ?? 0}%` }} />
          </div>
        )}
        {mandatory && state.status === "error" && (
          <p className="mt-1 text-xs leading-5">Puede continuar trabajando con la copia local y reintentar cuando vuelva la conexión.</p>
        )}
        {actionError && <p className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300">{actionError}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {ready && (
            <button type="button" disabled={busy} onClick={() => void run("install")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              Reiniciar y actualizar
            </button>
          )}
          {state.status === "ready" && state.kind === "normal" && (
            <button type="button" disabled={busy} onClick={() => void run("postpone")} className="rounded-lg border border-current/20 px-3 py-2 text-xs font-semibold hover:bg-white/60 disabled:opacity-50 dark:hover:bg-zinc-900/50">
              Más tarde
            </button>
          )}
          {!ready && (
            <button type="button" disabled={busy || state.status === "checking" || state.status === "downloading"} onClick={() => void run("check")} className="rounded-lg border border-current/20 px-3 py-2 text-xs font-semibold hover:bg-white/60 disabled:opacity-50 dark:hover:bg-zinc-900/50">
              {state.status === "checking" ? "Buscando..." : "Buscar actualizaciones"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function summary(state: DesktopUpdateClientState) {
  const version = state.version ? ` ${state.version}` : "";
  if (state.status === "checking") return "Buscando actualizaciones";
  if (state.status === "available") return `Actualización${version} disponible`;
  if (state.status === "mandatory") return `Actualización obligatoria${version}`;
  if (state.status === "downloading") return `Descargando${version}: ${state.percent ?? 0}%`;
  if (state.status === "ready") return `${state.kind === "mandatory" ? "Actualización obligatoria" : "Actualización"}${version} lista`;
  if (state.status === "postponed") return `Actualización${version} pospuesta`;
  if (state.status === "error") return state.kind === "mandatory" ? `Actualización obligatoria${version} pendiente` : "No se pudo buscar la actualización";
  return "Buscar actualizaciones";
}
