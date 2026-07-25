"use client";

import { useState } from "react";
import { activateDesktop } from "@/lib/desktop-sync/client";
import { getDesktopRuntime } from "@/lib/desktop-runtime";

export function DesktopActivation({ onActivated }: { onActivated: () => void }) {
  const runtime = getDesktopRuntime();
  const [centralAppUrl, setCentralAppUrl] = useState(runtime?.centralUrl || "");
  const [centralPocketBaseUrl, setCentralPocketBaseUrl] = useState("");
  const [deviceName, setDeviceName] = useState(runtime?.deviceCode || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      await activateDesktop(
        { centralAppUrl, centralPocketBaseUrl, deviceName, email, password },
        setProgress,
      );
      setPassword("");
      onActivated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo activar este equipo.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:p-9">
        <div className="mb-7 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">PC</div>
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Primera configuración</p>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Activar versión de escritorio</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              La primera activación necesita Internet. Después podrá ingresar y trabajar con pacientes, consultas y recetas sin conexión.
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
          <div><span className="block text-zinc-500">Código del equipo</span><strong>{runtime?.deviceCode}</strong></div>
          <div><span className="block text-zinc-500">Versión</span><strong>{runtime?.appVersion}</strong></div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="URL de la aplicación central" type="url" value={centralAppUrl} onChange={setCentralAppUrl} placeholder="https://consultorio.ejemplo.com" />
          <Field label="URL de PocketBase central" type="url" value={centralPocketBaseUrl} onChange={setCentralPocketBaseUrl} placeholder="https://datos.ejemplo.com" />
          <Field label="Nombre visible del equipo" value={deviceName} onChange={setDeviceName} placeholder="Consultorio 1" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field label="Contraseña" type="password" value={password} onChange={setPassword} />
          </div>

          {progress && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{progress}</p>}
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

          <button type="submit" disabled={working} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {working ? "Activando y copiando datos..." : "Activar este equipo"}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-zinc-500">
          La contraseña se usa para validar la cuenta y crear su acceso local cifrado por PocketBase; no se guarda en forma reversible.
        </p>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-zinc-950"
      />
    </label>
  );
}
