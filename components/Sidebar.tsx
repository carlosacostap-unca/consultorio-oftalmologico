"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { usePathname, useRouter } from "next/navigation";
import type { AppUser } from "@/lib/types";
import {
  ACTIVE_ROLE_CHANGED_EVENT,
  activeRoleLabel,
  getValidStoredActiveRole,
  resolveActiveRole,
  setActiveRole,
} from "@/lib/active-role";
import { ROLE_LABELS, normalizeUserRoles, type UserRole } from "@/lib/permissions";

type MenuItem = { name: string; href: string };
type MenuSectionDefinition = { title: string; items: MenuItem[] };
const SIDEBAR_COLLAPSED_STORAGE_KEY = "consultorio.sidebarCollapsed";

export function Sidebar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [assignedRoles, setAssignedRoles] = useState<UserRole[]>([]);
  const [activeRole, setCurrentActiveRole] = useState<UserRole | null>(null);
  const [currentHash, setCurrentHash] = useState("");
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();

    const loadUserRole = async () => {
      const record = pb.authStore.record as AppUser | null;
      if (!pb.authStore.isValid || !record?.id) {
        setUser(null);
        setAssignedRoles([]);
        setCurrentActiveRole(null);
        return;
      }

      try {
        const freshUser = await pb.collection("users").getOne<AppUser>(record.id, { requestKey: null });
        const roles = normalizeUserRoles(freshUser, ["secretaria"]);
        const storedRole = getValidStoredActiveRole(freshUser);
        const resolvedRole = storedRole || resolveActiveRole(freshUser, ["secretaria"]);

        setUser(freshUser);
        setAssignedRoles(roles);
        setCurrentActiveRole(resolvedRole);

        if (!storedRole && resolvedRole && freshUser.id) {
          setActiveRole(freshUser.id, resolvedRole);
        }
      } catch (error) {
        console.error("Error al cargar rol del usuario:", error);
        const roles = normalizeUserRoles(record, ["secretaria"]);
        const storedRole = getValidStoredActiveRole(record);
        const resolvedRole = storedRole || resolveActiveRole(record, roles);

        setUser(record);
        setAssignedRoles(roles);
        setCurrentActiveRole(resolvedRole);

        if (!storedRole && resolvedRole && record.id) {
          setActiveRole(record.id, resolvedRole);
        }
      }
    };

    const init = async () => {
      setIsMounted(true);
      setIsLoggedIn(pb.authStore.isValid);
      try {
        const storedSidebarState = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
        setIsCollapsed(storedSidebarState === null ? true : storedSidebarState === "true");
      } catch {
        setIsCollapsed(true);
      }
      await loadUserRole();
    };
    init();

    const unsubscribe = pb.authStore.onChange(() => {
      setIsLoggedIn(pb.authStore.isValid);
      loadUserRole();
    });

    const handleActiveRoleChange = () => {
      const record = pb.authStore.record as AppUser | null;
      if (!record?.id) return;
      setCurrentActiveRole(resolveActiveRole(record));
      loadUserRole();
    };

    window.addEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);
    window.addEventListener("hashchange", updateHash);

    return () => {
      unsubscribe();
      window.removeEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);
      window.removeEventListener("hashchange", updateHash);
    };
  }, []);

  useEffect(() => {
    if (!isRoleMenuOpen && !isProfileMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!roleMenuRef.current?.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRoleMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isRoleMenuOpen, isProfileMenuOpen]);

  if (!isMounted || !isLoggedIn) {
    return null;
  }

  const menuSections = getMenuSections(activeRole);

  const toggleCollapsed = () => {
    setIsRoleMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // Si el navegador bloquea localStorage, el estado igual funciona durante la sesion.
      }
      return next;
    });
  };

  const changeActiveRole = (role: UserRole) => {
    if (!user?.id || !assignedRoles.includes(role)) return;

    setActiveRole(user.id, role);
    setCurrentActiveRole(role);
  };

  const logout = () => {
    setIsRoleMenuOpen(false);
    setIsProfileMenuOpen(false);
    closePasswordModal();
    pb.authStore.clear();
    setIsLoggedIn(false);
    setUser(null);
    setAssignedRoles([]);
    setCurrentActiveRole(null);
    router.push("/");
  };

  const openPasswordModal = () => {
    setIsProfileMenuOpen(false);
    setPasswordSuccess("");
    setPasswordError("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordError("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setIsSavingPassword(false);
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setPasswordError("Las contrasenas no coinciden.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch("/api/usuarios/password", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${pb.authStore.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword, passwordConfirm: newPasswordConfirm }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "No se pudo cambiar la contrasena");
      }

      closePasswordModal();
      setPasswordSuccess("Contrasena actualizada.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "No se pudo cambiar la contrasena.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const activeRoleName = activeRoleLabel(activeRole);

  return (
    <aside className={`${isCollapsed ? "w-20" : "w-64"} bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 h-screen flex flex-col shrink-0 print:hidden transition-[width] duration-200 ease-in-out`}>
      <div className={`${isCollapsed ? "p-3" : "p-4"} border-b border-zinc-200 dark:border-zinc-800`}>
        <div className={`flex items-center ${isCollapsed ? "flex-col gap-3" : "justify-between gap-3"}`}>
          <Link
            href="/"
            aria-label="Ir al inicio"
            title="Consultorio"
            className={`min-w-0 text-xl font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 ${isCollapsed ? "justify-center" : ""}`}
          >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
            {!isCollapsed && <span className="truncate">Consultorio</span>}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? "Expandir menu lateral" : "Contraer menu lateral"}
            aria-pressed={isCollapsed}
            title={isCollapsed ? "Expandir menu" : "Contraer menu"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <nav className={`${isCollapsed ? "space-y-3 p-3" : "space-y-6 p-4"} flex-1 overflow-y-auto overflow-x-hidden`}>
        {menuSections.map((section) => (
          <MenuSection key={section.title} title={section.title} items={section.items} pathname={pathname} currentHash={currentHash} isCollapsed={isCollapsed} />
        ))}
      </nav>
      {user && (
        <div className={`${isCollapsed ? "p-3" : "p-4"} border-t border-zinc-200 dark:border-zinc-800`}>
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen((current) => !current);
                setIsRoleMenuOpen(false);
              }}
              aria-label="Abrir opciones de usuario"
              aria-expanded={isProfileMenuOpen}
              title={user.name || user.email || "Usuario"}
              className={`flex w-full items-center rounded-xl text-left transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:hover:bg-zinc-800 ${
                isCollapsed ? "justify-center p-1" : "gap-3 p-2 -m-2"
              }`}
            >
              {user.avatar ? (
                <span
                  aria-label="Avatar"
                  className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-cover bg-center shrink-0"
                  style={{ backgroundImage: `url(${pb.files.getURL(user, user.avatar)})` }}
                />
              ) : (
                <span className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                  {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                </span>
              )}
              {!isCollapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {user.name || user.email || "Usuario"}
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</span>
                </span>
              )}
            </button>
            {isProfileMenuOpen && (
              <div
                className={`absolute z-50 w-52 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 ${
                  isCollapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-2"
                }`}
              >
                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <LockIcon className="h-4 w-4" />
                  Cambiar contrasena
                </button>
              </div>
            )}
          </div>
          {passwordSuccess && !isCollapsed && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
              {passwordSuccess}
            </div>
          )}
          {isCollapsed && (
            <div className="mt-3 flex flex-col items-center gap-2">
              {assignedRoles.length > 1 ? (
                <div ref={roleMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRoleMenuOpen((current) => !current)}
                    aria-label="Cambiar rol"
                    aria-expanded={isRoleMenuOpen}
                    title={`Cambiar rol${activeRoleName ? `: ${activeRoleName}` : ""}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {getRoleAbbreviation(activeRole)}
                  </button>
                  {isRoleMenuOpen && (
                    <div className="absolute bottom-0 left-full z-50 ml-2 w-44 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40">
                      {assignedRoles.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            changeActiveRole(role);
                            setIsRoleMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                            role === activeRole
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span>{ROLE_LABELS[role]}</span>
                          {role === activeRole && <CheckIcon className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                activeRole && (
                  <div
                    aria-label={activeRoleName}
                    title={activeRoleName}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    {getRoleAbbreviation(activeRole)}
                  </div>
                )
              )}
              <button
                type="button"
                onClick={logout}
                aria-label="Cerrar sesion"
                title="Cerrar sesion"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                <LogoutIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          {!isCollapsed && assignedRoles.length > 1 ? (
            <select
              value={activeRole || ""}
              onChange={(event) => changeActiveRole(event.target.value as UserRole)}
              className="mt-3 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {assignedRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          ) : (
            !isCollapsed && activeRole && (
              <div className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400">
                {activeRoleLabel(activeRole)}
              </div>
            )
          )}
          {!isCollapsed && (
            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              <LogoutIcon className="h-4 w-4" />
              Cerrar sesion
            </button>
          )}
        </div>
      )}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Cambiar contrasena</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Ingresa y repeti la nueva contrasena para tu usuario.
                </p>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                aria-label="Cerrar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label htmlFor="sidebar-new-password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nueva contrasena
                </label>
                <input
                  id="sidebar-new-password"
                  required
                  minLength={8}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </div>
              <div>
                <label htmlFor="sidebar-new-password-confirm" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Repetir contrasena
                </label>
                <input
                  id="sidebar-new-password-confirm"
                  required
                  minLength={8}
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(event) => setNewPasswordConfirm(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </div>
              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  {passwordError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingPassword ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

function getMenuSections(activeRole: UserRole | null): MenuSectionDefinition[] {
  if (activeRole === "admin") {
    return [
      {
        title: "Configuracion",
        items: [
          { name: "Usuarios", href: "/usuarios" },
          { name: "Permisos", href: "/permisos" },
          { name: "Edicion de consultas", href: "/edicion-consultas" },
          { name: "Horarios medicos", href: "/horarios-medicos" },
          { name: "Bloqueos y feriados", href: "/bloqueos-agenda" },
        ],
      },
      {
        title: "Datos",
        items: [
          { name: "Pacientes", href: "/pacientes" },
          { name: "Mutuales", href: "/mutuales" },
          { name: "Turnos", href: "/turnos" },
          { name: "Consultas", href: "/consultas" },
          { name: "Recetas", href: "/recetas" },
        ],
      },
      {
        title: "Calidad de datos",
        items: [
          { name: "Duplicados", href: "/pacientes/duplicados" },
          { name: "DNI duplicados", href: "/pacientes/dni-duplicados" },
          { name: "Fichas duplicadas", href: "/pacientes/fichas-duplicadas" },
        ],
      },
    ];
  }

  if (activeRole === "medico") {
    return [
      {
        title: "Atencion",
        items: [
          { name: "Mi jornada", href: "/turnos" },
          { name: "Consultas", href: "/consultas" },
          { name: "Recetas", href: "/recetas" },
        ],
      },
      {
        title: "Pacientes",
        items: [{ name: "Pacientes", href: "/pacientes" }],
      },
      {
        title: "Agenda",
        items: [{ name: "Mis bloqueos", href: "/bloqueos-agenda" }],
      },
    ];
  }

  return [
    {
      title: "Agenda",
      items: [
        { name: "Turnos", href: "/turnos" },
        { name: "Bloqueos y feriados", href: "/bloqueos-agenda" },
      ],
    },
    {
      title: "Pacientes",
      items: [
        { name: "Pacientes", href: "/pacientes" },
        { name: "Mutuales", href: "/mutuales" },
      ],
    },
    {
      title: "Clinica",
      items: [
        { name: "Consultas", href: "/consultas" },
        { name: "Recetas", href: "/recetas" },
      ],
    },
  ];
}

function MenuSection({
  title,
  items,
  pathname,
  currentHash,
  isCollapsed,
}: {
  title: string;
  items: MenuItem[];
  pathname: string;
  currentHash: string;
  isCollapsed: boolean;
}) {
  return (
    <div className="space-y-2">
      {title && !isCollapsed && (
        <div className="px-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
          <span className="inline-block border-b border-zinc-400 pb-1 dark:border-zinc-600">
            {title}
          </span>
        </div>
      )}
      {items.map((item) => {
        const [itemPath, itemHash] = item.href.split("#");
        const hash = itemHash ? `#${itemHash}` : "";
        const isActive = hash
          ? pathname === itemPath && currentHash === hash
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.name}
            href={item.href}
            title={isCollapsed ? item.name : undefined}
            aria-label={item.name}
            className={`${isCollapsed ? "flex h-11 w-full items-center justify-center px-0 text-sm" : "block px-4 py-3"} rounded-xl transition-colors font-medium ${
              isActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {isCollapsed ? getMenuItemInitials(item.name) : item.name}
          </Link>
        );
      })}
    </div>
  );
}

function getMenuItemInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function getRoleAbbreviation(role: UserRole | null) {
  if (role === "admin") return "A";
  if (role === "medico") return "M";
  if (role === "secretaria") return "S";
  return "R";
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3-3H9.75m9 0-3-3m3 3-3 3"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 13 4 4L19 7" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 10.5h10.5a2.25 2.25 0 0 0 2.25-2.25v-6a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 12.75v6A2.25 2.25 0 0 0 6.75 21Z"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
