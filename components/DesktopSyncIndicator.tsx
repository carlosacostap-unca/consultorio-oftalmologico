"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DESKTOP_SYNC_STATUS_EVENT, getDesktopSyncStatus } from "@/lib/desktop-sync/engine";
import { presentSyncStatus } from "@/lib/desktop-sync/status-presentation";
import type { SyncStatusSnapshot } from "@/lib/desktop-sync/types";

export function DesktopSyncIndicator({ collapsed }: { collapsed: boolean }) {
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null);

  useEffect(() => {
    if (!window.consultorioDesktop) return;
    const refresh = () => void getDesktopSyncStatus().then(setStatus).catch(() => undefined);
    const handleStatus = (event: Event) => setStatus((event as CustomEvent<SyncStatusSnapshot>).detail);
    refresh();
    window.addEventListener(DESKTOP_SYNC_STATUS_EVENT, handleStatus);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    const interval = window.setInterval(refresh, 15_000);
    return () => {
      window.removeEventListener(DESKTOP_SYNC_STATUS_EVENT, handleStatus);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.clearInterval(interval);
    };
  }, []);

  if (!status) return null;
  const attention = status.errors + status.conflicts;
  const presentation = presentSyncStatus(status);
  const color = attention > 0 || presentation.tone === "amber"
    ? "bg-amber-500"
    : presentation.tone === "blue"
      ? "bg-blue-500"
      : presentation.tone === "green"
        ? "bg-emerald-500"
        : "bg-zinc-400";
  const label = attention > 0
    ? `${attention} pendiente${attention === 1 ? "" : "s"} de revisión`
    : presentation.label;

  return (
    <div className={collapsed ? "px-3 pb-2" : "px-4 pb-3"}>
      <Link href="/sincronizacion" title={label} className={`flex items-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 ${collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"}`}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color} ${presentation.active ? "animate-pulse" : ""}`} />
        {!collapsed && <span className="min-w-0"><strong className="block truncate text-zinc-800 dark:text-zinc-200">{label}</strong><span className="text-xs text-zinc-500">Ver sincronización</span></span>}
      </Link>
    </div>
  );
}
