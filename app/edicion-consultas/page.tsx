"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACTIVE_ROLE_CHANGED_EVENT,
  activeRoleAuthHeaders,
  activeRoleJsonHeaders,
  canUseAdminFeatures,
  getValidStoredActiveRole,
} from "@/lib/active-role";
import { pb } from "@/lib/pocketbase";
import type { UserRole } from "@/lib/permissions";
import type { SystemSettings } from "@/lib/system-settings";
import type { AppUser } from "@/lib/types";

const DEFAULT_EMAIL_SETTINGS = {
  appointmentRemindersEnabled: false,
  appointmentReminderHoursBefore: 24,
  emailSmtpHost: "smtp.gmail.com",
  emailSmtpPort: 465,
  emailSmtpSecure: true,
  emailSmtpUser: "",
  emailSmtpFromName: "Consultorio oftalmologico",
  emailSmtpFromAddress: "",
  emailSmtpPasswordConfigured: false,
};

export default function EdicionConsultasPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(null);
  const [consultaEditLimitDays, setConsultaEditLimitDays] = useState(7);
  const [emailSettings, setEmailSettings] = useState(DEFAULT_EMAIL_SETTINGS);
  const [emailSmtpPassword, setEmailSmtpPassword] = useState("");

  useEffect(() => {
    setIsMounted(true);

    const loadData = async () => {
      if (!pb.authStore.isValid) {
        router.push("/");
        return;
      }

      const authUser = pb.authStore.record as AppUser | null;
      if (!authUser?.id) {
        router.push("/");
        return;
      }

      try {
        const freshUser = await pb.collection("users").getOne<AppUser>(authUser.id, { requestKey: null });
        const storedActiveRole = getValidStoredActiveRole(freshUser);
        setCurrentUser(freshUser);
        setActiveRoleState(storedActiveRole);

        if (!canUseAdminFeatures(freshUser, storedActiveRole)) {
          router.push("/");
          return;
        }

        const response = await fetch("/api/configuracion", {
          headers: activeRoleAuthHeaders(pb.authStore.token, storedActiveRole),
        });
        if (!response.ok) {
          throw new Error("No se pudo cargar la configuracion");
        }

        const settings = await response.json();
        setConsultaEditLimitDays(settings.consultaEditLimitDays ?? 7);
        setEmailSettings(normalizeEmailSettings(settings));
      } catch (error) {
        console.error("Error al cargar configuracion:", error);
        alert("No se pudo cargar la configuracion.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    const handleActiveRoleChange = () => {
      const authUser = pb.authStore.record as AppUser | null;
      if (!authUser?.id) {
        router.push("/");
        return;
      }

      const nextActiveRole = getValidStoredActiveRole(authUser);
      setActiveRoleState(nextActiveRole);

      if (!canUseAdminFeatures(authUser, nextActiveRole)) {
        router.push("/");
      }
    };

    window.addEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);

    return () => {
      window.removeEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);
    };
  }, [router]);

  const saveConsultaEditLimitDays = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: {
          ...activeRoleJsonHeaders(pb.authStore.token, activeRole),
        },
        body: JSON.stringify({ consultaEditLimitDays }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updated = await response.json();
      setConsultaEditLimitDays(updated.consultaEditLimitDays ?? consultaEditLimitDays);
    } catch (error) {
      console.error("Error al guardar configuracion:", error);
      alert("No se pudo guardar la configuracion.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveEmailSettings = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...emailSettings,
        emailSmtpPort: Number(emailSettings.emailSmtpPort),
        appointmentReminderHoursBefore: Number(emailSettings.appointmentReminderHoursBefore),
      };
      if (emailSmtpPassword.trim()) {
        payload.emailSmtpPassword = emailSmtpPassword.trim();
      }

      const response = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: {
          ...activeRoleJsonHeaders(pb.authStore.token, activeRole),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "No se pudo guardar la configuracion");
      }

      const updated = await response.json();
      setEmailSettings(normalizeEmailSettings(updated));
      setEmailSmtpPassword("");
    } catch (error) {
      console.error("Error al guardar configuracion de email:", error);
      alert(error instanceof Error ? error.message : "No se pudo guardar la configuracion de email.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isMounted || !currentUser) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Cargando configuracion...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Configuracion clinica</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Administra edicion de consultas y recordatorios de turnos</p>
          </div>
        </div>

        <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Configuracion de consultas</h2>
          </div>
          <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Dias permitidos para editar consultas
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={consultaEditLimitDays}
                onChange={(event) => setConsultaEditLimitDays(Number(event.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Usa 0 para permitir editar solo consultas del dia actual.
              </p>
            </div>
            <button
              type="button"
              onClick={saveConsultaEditLimitDays}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Guardar configuracion
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Recordatorios de turnos por email</h2>
          </div>
          <div className="p-6 space-y-6">
            <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <input
                id="appointmentRemindersEnabled"
                type="checkbox"
                checked={emailSettings.appointmentRemindersEnabled}
                onChange={(event) => setEmailSettings((prev) => ({ ...prev, appointmentRemindersEnabled: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block font-medium text-zinc-900 dark:text-zinc-100">Activar recordatorios automaticos</span>
                <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                  El envio se ejecuta desde el proceso programado del servidor.
                </span>
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="appointmentReminderHoursBefore" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Horas de anticipacion
                </label>
                <input
                  id="appointmentReminderHoursBefore"
                  type="number"
                  min={1}
                  step={1}
                  value={emailSettings.appointmentReminderHoursBefore}
                  onChange={(event) => setEmailSettings((prev) => ({ ...prev, appointmentReminderHoursBefore: Number(event.target.value) }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                />
              </div>
              <div>
                <label htmlFor="emailSmtpHost" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Host SMTP
                </label>
                <input
                  id="emailSmtpHost"
                  value={emailSettings.emailSmtpHost}
                  onChange={(event) => setEmailSettings((prev) => ({ ...prev, emailSmtpHost: event.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                />
              </div>
              <div>
                <label htmlFor="emailSmtpPort" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Puerto SMTP
                </label>
                <input
                  id="emailSmtpPort"
                  type="number"
                  min={1}
                  max={65535}
                  value={emailSettings.emailSmtpPort}
                  onChange={(event) => setEmailSettings((prev) => ({ ...prev, emailSmtpPort: Number(event.target.value) }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                />
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
                <input
                  id="emailSmtpSecure"
                  type="checkbox"
                  checked={emailSettings.emailSmtpSecure}
                  onChange={(event) => setEmailSettings((prev) => ({ ...prev, emailSmtpSecure: event.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Usar TLS directo</span>
              </label>
              <div>
                <label htmlFor="emailSmtpUser" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Usuario SMTP
                </label>
                <input
                  id="emailSmtpUser"
                  type="email"
                  value={emailSettings.emailSmtpUser}
                  onChange={(event) => setEmailSettings((prev) => ({ ...prev, emailSmtpUser: event.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                />
              </div>
              <div>
                <label htmlFor="emailSmtpFromAddress" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Email remitente
                </label>
                <input
                  id="emailSmtpFromAddress"
                  type="email"
                  value={emailSettings.emailSmtpFromAddress}
                  onChange={(event) => setEmailSettings((prev) => ({ ...prev, emailSmtpFromAddress: event.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                />
              </div>
              <div>
                <label htmlFor="emailSmtpFromName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nombre remitente
                </label>
                <input
                  id="emailSmtpFromName"
                  value={emailSettings.emailSmtpFromName}
                  onChange={(event) => setEmailSettings((prev) => ({ ...prev, emailSmtpFromName: event.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                />
              </div>
              <div>
                <label htmlFor="emailSmtpPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  App Password SMTP
                </label>
                <input
                  id="emailSmtpPassword"
                  type="password"
                  value={emailSmtpPassword}
                  onChange={(event) => setEmailSmtpPassword(event.target.value)}
                  placeholder={emailSettings.emailSmtpPasswordConfigured ? "Configurada, completar solo para reemplazar" : "App Password de Gmail"}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Estado: {emailSettings.emailSmtpPasswordConfigured ? "App Password configurada" : "sin App Password configurada"}.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveEmailSettings}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Guardar recordatorios
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function normalizeEmailSettings(settings: Partial<SystemSettings>) {
  return {
    appointmentRemindersEnabled: Boolean(settings.appointmentRemindersEnabled ?? DEFAULT_EMAIL_SETTINGS.appointmentRemindersEnabled),
    appointmentReminderHoursBefore: Number(settings.appointmentReminderHoursBefore ?? DEFAULT_EMAIL_SETTINGS.appointmentReminderHoursBefore),
    emailSmtpHost: String(settings.emailSmtpHost || DEFAULT_EMAIL_SETTINGS.emailSmtpHost),
    emailSmtpPort: Number(settings.emailSmtpPort ?? DEFAULT_EMAIL_SETTINGS.emailSmtpPort),
    emailSmtpSecure: Boolean(settings.emailSmtpSecure ?? DEFAULT_EMAIL_SETTINGS.emailSmtpSecure),
    emailSmtpUser: String(settings.emailSmtpUser || ""),
    emailSmtpFromName: String(settings.emailSmtpFromName || DEFAULT_EMAIL_SETTINGS.emailSmtpFromName),
    emailSmtpFromAddress: String(settings.emailSmtpFromAddress || ""),
    emailSmtpPasswordConfigured: Boolean(settings.emailSmtpPasswordConfigured),
  };
}
