"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import {
  ACTIVE_ROLE_CHANGED_EVENT,
  activeRoleAuthHeaders,
  activeRoleJsonHeaders,
  canUseAdminFeatures,
  getValidStoredActiveRole,
} from "@/lib/active-role";
import {
  MANAGED_ROLES,
  PERMISSION_GROUPS,
  ROLE_LABELS,
  type PermissionKey,
  type UserRole,
} from "@/lib/permissions";
import type { AppUser } from "@/lib/types";

export default function PermisosPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, PermissionKey[]>>({});

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

        const permissionsResponse = await fetch("/api/permisos", {
          headers: activeRoleAuthHeaders(pb.authStore.token, storedActiveRole),
        });
        if (!permissionsResponse.ok) {
          throw new Error("No se pudieron cargar permisos");
        }

        const data = await permissionsResponse.json();
        setRolePermissions(data.rolePermissions || {});
      } catch (error) {
        console.error("Error al cargar permisos:", error);
        alert("No se pudieron cargar los permisos.");
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

  const togglePermission = (role: UserRole, permission: PermissionKey) => {
    setRolePermissions((prev) => {
      const current = prev[role] || [];
      const next = current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission];

      return { ...prev, [role]: next };
    });
  };

  const saveRolePermissions = async (role: UserRole) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/permisos", {
        method: "PATCH",
        headers: {
          ...activeRoleJsonHeaders(pb.authStore.token, activeRole),
        },
        body: JSON.stringify({ role, permissions: rolePermissions[role] || [] }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updated = await response.json();
      setRolePermissions((prev) => ({ ...prev, [role]: updated.permissions || [] }));
    } catch (error) {
      console.error("Error al guardar permisos:", error);
      alert("No se pudieron guardar los permisos.");
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
          Cargando permisos...
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Permisos</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Administra permisos operativos por rol</p>
          </div>
        </div>

        <section id="permisos" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-6">
          {MANAGED_ROLES.map((role) => (
            <div key={role} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{ROLE_LABELS[role]}</h2>
                <button
                  type="button"
                  onClick={() => saveRolePermissions(role)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
              <div className="p-6 space-y-6">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">{group.title}</h3>
                    <div className="space-y-2">
                      {group.permissions.map((permission) => (
                        <label key={permission.key} className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={(rolePermissions[role] || []).includes(permission.key)}
                            onChange={() => togglePermission(role, permission.key)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          {permission.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
