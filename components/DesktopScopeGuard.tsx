"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { DESKTOP_SCOPE_MESSAGE, isDesktopSupportedPath } from "@/lib/desktop-scope";

const subscribeRuntime = () => () => undefined;
const readDesktopRuntime = () => Boolean(window.consultorioDesktop);
const readServerRuntime = () => false;

export function DesktopScopeGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useSyncExternalStore(subscribeRuntime, readDesktopRuntime, readServerRuntime);

  if (!isDesktop || isDesktopSupportedPath(pathname)) return children;

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-7 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Sólo disponible en la versión web</p>
        <h1 className="mt-2 text-2xl font-bold">Este módulo no admite cambios offline</h1>
        <p className="mt-3 text-sm leading-6 text-amber-900/80 dark:text-amber-100/80">{DESKTOP_SCOPE_MESSAGE}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pacientes" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Ir a pacientes</Link>
          <Link href="/sincronizacion" className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40">Ver sincronización</Link>
        </div>
      </section>
    </div>
  );
}
