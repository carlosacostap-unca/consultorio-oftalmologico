"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ACTIVE_ROLE_CHANGED_EVENT,
  activeRoleLabel,
  clearActiveRole,
  getValidStoredActiveRole,
  resolveActiveRole,
  setActiveRole,
} from "@/lib/active-role";
import { pb } from "@/lib/pocketbase";
import type { UserRole } from "@/lib/permissions";
import type { AppUser } from "@/lib/types";

type DashboardAction = {
  title: string;
  href: string;
  accentClass: string;
  iconPath: string;
};

type RoleDashboard = {
  title: string;
  subtitle: string;
  actions: DashboardAction[];
};

const ROLE_DASHBOARDS: Record<UserRole, RoleDashboard> = {
  secretaria: {
    title: "Agenda del consultorio",
    subtitle: "Turnos, pacientes y mutuales",
    actions: [
      {
        title: "Turnos",
        href: "/turnos",
        accentClass: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/10",
        iconPath: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
      {
        title: "Nuevo turno",
        href: "/turnos/nuevo",
        accentClass: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10",
        iconPath: "M12 4v16m8-8H4",
      },
      {
        title: "Pacientes",
        href: "/pacientes",
        accentClass: "text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10",
        iconPath: "M15 19a6 6 0 00-12 0m12 0h6m-6 0v2m-6-9a4 4 0 110-8 4 4 0 010 8zm10 1v6m3-3h-6",
      },
      {
        title: "Mutuales",
        href: "/mutuales",
        accentClass: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10",
        iconPath: "M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14l-4-2-3 2-3-2-4 2V6a2 2 0 012-2z",
      },
    ],
  },
  medico: {
    title: "Mi jornada medica",
    subtitle: "Atencion, pacientes y recetas",
    actions: [
      {
        title: "Mi jornada",
        href: "/turnos",
        accentClass: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10",
        iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-6 0a2 2 0 114 0m-4 0a2 2 0 104 0m-1 8l-2 2-1-1",
      },
      {
        title: "Consultas",
        href: "/consultas",
        accentClass: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/10",
        iconPath: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z",
      },
      {
        title: "Pacientes",
        href: "/pacientes",
        accentClass: "text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10",
        iconPath: "M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m0 0a4 4 0 100-7.75 4 4 0 000 7.75zm8 0a4 4 0 10-1-7.87",
      },
      {
        title: "Recetas",
        href: "/recetas",
        accentClass: "text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/10",
        iconPath: "M19 21H5a2 2 0 01-2-2V7a2 2 0 012-2h8l6 6v8a2 2 0 01-2 2zM13 5v6h6",
      },
    ],
  },
  admin: {
    title: "Administracion",
    subtitle: "Configuracion y calidad de datos",
    actions: [
      {
        title: "Usuarios",
        href: "/usuarios",
        accentClass: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-500/10",
        iconPath: "M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m0 0a4 4 0 100-7.75 4 4 0 000 7.75zm8 0a4 4 0 10-1-7.87",
      },
      {
        title: "Permisos",
        href: "/permisos",
        accentClass: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10",
        iconPath: "M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3zm-7 9v-1a7 7 0 0114 0v1",
      },
      {
        title: "Horarios medicos",
        href: "/horarios-medicos",
        accentClass: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10",
        iconPath: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
      },
      {
        title: "Duplicados",
        href: "/pacientes/duplicados",
        accentClass: "text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10",
        iconPath: "M8 7h8M8 11h8M8 15h5M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
      },
    ],
  },
};

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setCurrentActiveRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const loadUser = async (record: AppUser | null) => {
      if (!pb.authStore.isValid || !record?.id) {
        setUser(null);
        setCurrentActiveRole(null);
        return;
      }

      try {
        const freshUser = await pb.collection("users").getOne<AppUser>(record.id, { requestKey: null });
        const storedRole = getValidStoredActiveRole(freshUser);
        const resolvedRole = storedRole || resolveActiveRole(freshUser, ["secretaria"]);

        setUser(freshUser);
        setCurrentActiveRole(resolvedRole);

        if (!storedRole && resolvedRole && freshUser.id) {
          setActiveRole(freshUser.id, resolvedRole);
        }
      } catch (error) {
        console.error("Error al cargar usuario autenticado:", error);
        const storedRole = getValidStoredActiveRole(record);
        const resolvedRole = storedRole || resolveActiveRole(record, ["secretaria"]);

        setUser(record);
        setCurrentActiveRole(resolvedRole);

        if (!storedRole && resolvedRole && record.id) {
          setActiveRole(record.id, resolvedRole);
        }
      }
    };

    const unsubscribe = pb.authStore.onChange((_token, record) => {
      loadUser(record as AppUser | null);
    }, true);

    const handleActiveRoleChange = () => {
      const record = pb.authStore.record as AppUser | null;
      if (!record?.id) return;
      setCurrentActiveRole(resolveActiveRole(record, ["secretaria"]));
    };

    window.addEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);

    return () => {
      unsubscribe();
      window.removeEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);
    };
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setLoginError("");

    try {
      await pb.collection("users").authWithOAuth2({ provider: "google" });
    } catch (error) {
      console.error("Error al iniciar sesion con Google:", error);
      alert("Hubo un error al intentar iniciar sesion. Verifica la consola.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setLoginError("");

    try {
      const authData = await pb.collection("users").authWithPassword(emailLogin.trim(), passwordLogin);
      const authUser = authData.record as AppUser;
      const resolvedRole = resolveActiveRole(authUser, ["secretaria"]);

      if (resolvedRole && authUser.id) {
        setActiveRole(authUser.id, resolvedRole);
      }
    } catch (error) {
      console.error("Error al iniciar sesion con email:", error);
      setLoginError("No se pudo iniciar sesion. Revisa el email y la contrasena.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearActiveRole(user?.id);
    pb.authStore.clear();
  };

  if (!isMounted) {
    return null;
  }

  if (user) {
    const dashboard = ROLE_DASHBOARDS[activeRole || "secretaria"];

    return (
      <div className="min-h-screen bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col items-center justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row">
            <div className="mb-4 flex items-center gap-4 sm:mb-0">
              {user.avatar ? (
                <img
                  src={pb.files.getURL(user, user.avatar)}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full border-2 border-blue-500 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                  {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Bienvenido/a, {user.name || "Usuario"}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
                {activeRole && (
                  <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                    Rol activo: {activeRoleLabel(activeRole)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="rounded-xl bg-zinc-100 px-5 py-2.5 font-medium text-zinc-800 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Cerrar sesion
            </button>
          </div>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {activeRole ? activeRoleLabel(activeRole) : "Rol activo"}
                </p>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{dashboard.title}</h2>
              </div>
              <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">{dashboard.subtitle}</p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dashboard.actions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group flex min-h-32 flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-blue-400 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-500 dark:hover:bg-zinc-900"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${action.accentClass}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={action.iconPath} />
                    </svg>
                  </span>
                  <span className="mt-5 flex items-center justify-between gap-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {action.title}
                    <span className="text-blue-600 transition-transform group-hover:translate-x-1 dark:text-blue-400" aria-hidden="true">
                      &gt;
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-black">
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-8 w-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z" />
            </svg>
          </div>
        </div>

        <h1 className="mb-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Consultorio Oftalmologico</h1>
        <p className="mb-10 text-zinc-500 dark:text-zinc-400">Inicia sesion para acceder al sistema.</p>

        <form onSubmit={loginWithPassword} className="space-y-4 text-left">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
            <input
              required
              type="email"
              value={emailLogin}
              onChange={(event) => setEmailLogin(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Contrasena</label>
            <input
              required
              type="password"
              value={passwordLogin}
              onChange={(event) => setPasswordLogin(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            />
          </div>
          {loginError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {loginError}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Conectando..." : "Ingresar"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span>o</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <button
          onClick={loginWithGoogle}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          <span>{isLoading ? "Conectando..." : "Continuar con Google"}</span>
        </button>
      </div>
    </div>
  );
}
