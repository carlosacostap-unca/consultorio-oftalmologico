"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import {
  MANAGED_ROLES,
  PERMISSION_GROUPS,
  ROLE_LABELS,
  type PermissionKey,
  type UserRole,
} from "@/lib/permissions";
import type { AppUser } from "@/lib/types";

interface PermissionUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

interface CreateUserForm {
  name: string;
  email: string;
  role: UserRole;
}

const emptyCreateUserForm: CreateUserForm = {
  name: "",
  email: "",
  role: "secretaria",
};

export default function PermisosPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, PermissionKey[]>>({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>(emptyCreateUserForm);
  const [consultaEditLimitDays, setConsultaEditLimitDays] = useState(7);

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
        setCurrentUser(freshUser);

        if (freshUser.role !== "admin") {
          router.push("/");
          return;
        }

        const [permissionsResponse, settingsResponse] = await Promise.all([
          fetch("/api/permisos", {
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
          }),
          fetch("/api/configuracion", {
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
          }),
        ]);
        if (!permissionsResponse.ok || !settingsResponse.ok) {
          throw new Error("No se pudieron cargar permisos o configuracion");
        }

        const data = await permissionsResponse.json();
        const settings = await settingsResponse.json();
        setUsers(data.users || []);
        setRolePermissions(data.rolePermissions || {});
        setConsultaEditLimitDays(settings.consultaEditLimitDays ?? 7);
      } catch (error) {
        console.error("Error al cargar permisos:", error);
        alert("No se pudieron cargar los permisos.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const updateUserRole = async (userId: string, role: UserRole) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/usuarios/role", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ userId, role }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updated = await response.json();
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: updated.role } : user)));
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      alert("No se pudo actualizar el rol del usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify(createUserForm),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo crear el usuario");
      }

      const created = await response.json();
      setUsers((prev) => [...prev, created].sort((a, b) => a.email.localeCompare(b.email)));
      setCreateUserForm(emptyCreateUserForm);
      setIsCreatingUser(false);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      alert(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    } finally {
      setIsSaving(false);
    }
  };

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
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
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

  const saveConsultaEditLimitDays = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
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
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Administra roles y permisos operativos</p>
          </div>
        </div>

        <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Usuarios</h2>
            <button
              type="button"
              onClick={() => setIsCreatingUser((prev) => !prev)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              {isCreatingUser ? "Cancelar" : "Nuevo usuario"}
            </button>
          </div>
          {isCreatingUser && (
            <form onSubmit={createUser} className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={createUserForm.name}
                    onChange={(event) => setCreateUserForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Email *</label>
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={(event) => setCreateUserForm((prev) => ({ ...prev, email: event.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Rol *</label>
                  <select
                    value={createUserForm.role}
                    onChange={(event) => setCreateUserForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCreateUserForm(emptyCreateUserForm);
                    setIsCreatingUser(false);
                  }}
                  className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Crear usuario
                </button>
              </div>
            </form>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Usuario</th>
                  <th className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{user.name || user.email}</div>
                      {user.name && <div className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role || "secretaria"}
                        onChange={(event) => updateUserRole(user.id, event.target.value as UserRole)}
                        disabled={isSaving}
                        className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
                      >
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                          <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
