"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { usePathname } from "next/navigation";
import type { AppUser } from "@/lib/types";
import {
  ACTIVE_ROLE_CHANGED_EVENT,
  activeRoleLabel,
  getValidStoredActiveRole,
  resolveActiveRole,
  setActiveRole,
} from "@/lib/active-role";
import { ROLE_LABELS, normalizeUserRoles, type UserRole } from "@/lib/permissions";

export function Sidebar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [assignedRoles, setAssignedRoles] = useState<UserRole[]>([]);
  const [activeRole, setCurrentActiveRole] = useState<UserRole | null>(null);
  const [currentHash, setCurrentHash] = useState("");
  const pathname = usePathname();

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

  if (!isMounted || !isLoggedIn) {
    return null;
  }

  const isAdmin = activeRole === "admin";
  const dataMenuItems = [
    { name: "Pacientes", href: "/pacientes" },
    { name: "Mutuales", href: "/mutuales" },
    { name: "Turnos", href: "/turnos" },
    { name: "Consultas", href: "/consultas" },
    { name: "Recetas", href: "/recetas" },
  ];
  const configMenuItems = [
    { name: "Usuarios", href: "/usuarios" },
    { name: "Permisos", href: "/permisos" },
    { name: "Edicion de consultas", href: "/edicion-consultas" },
  ];

  const changeActiveRole = (role: UserRole) => {
    if (!user?.id || !assignedRoles.includes(role)) return;

    setActiveRole(user.id, role);
    setCurrentActiveRole(role);
  };

  return (
    <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 h-screen flex flex-col shrink-0 print:hidden">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
          Consultorio
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {isAdmin && (
          <MenuSection title="Configuracion" items={configMenuItems} pathname={pathname} currentHash={currentHash} />
        )}
        <MenuSection title={isAdmin ? "Datos" : ""} items={dataMenuItems} pathname={pathname} currentHash={currentHash} />
      </nav>
      {user && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <div
                aria-label="Avatar"
                className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-cover bg-center shrink-0"
                style={{ backgroundImage: `url(${pb.files.getURL(user, user.avatar)})` }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {user.name || user.email || "Usuario"}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</div>
            </div>
          </div>
          {assignedRoles.length > 1 ? (
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
            activeRole && (
              <div className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400">
                {activeRoleLabel(activeRole)}
              </div>
            )
          )}
        </div>
      )}
    </aside>
  );
}

function MenuSection({
  title,
  items,
  pathname,
  currentHash,
}: {
  title: string;
  items: { name: string; href: string }[];
  pathname: string;
  currentHash: string;
}) {
  return (
    <div className="space-y-2">
      {title && (
        <div className="px-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
          {title}
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
            className={`block px-4 py-3 rounded-xl transition-colors font-medium ${
              isActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}
