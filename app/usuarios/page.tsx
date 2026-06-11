"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ACTIVE_ROLE_CHANGED_EVENT,
  activeRoleAuthHeaders,
  activeRoleJsonHeaders,
  canUseAdminFeatures,
  getValidStoredActiveRole,
} from "@/lib/active-role";
import { pb } from "@/lib/pocketbase";
import { ROLE_LABELS, USER_ROLES, normalizeUserRoles, type UserRole } from "@/lib/permissions";
import type { AppUser } from "@/lib/types";

interface ManagedUser {
  id: string;
  email: string;
  name?: string;
  role?: UserRole;
  roles: UserRole[];
}

interface CreateUserForm {
  name: string;
  email: string;
  roles: UserRole[];
}

const emptyCreateUserForm: CreateUserForm = {
  name: "",
  email: "",
  roles: ["secretaria"],
};

export default function UsuariosPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>(emptyCreateUserForm);

  const loadUsers = useCallback(async (role: UserRole | null) => {
    const response = await fetch("/api/usuarios", {
      headers: activeRoleAuthHeaders(pb.authStore.token, role),
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los usuarios");
    }

    const data = await response.json();
    setUsers(
      (data.users || []).map((user: ManagedUser) => ({
        ...user,
        roles: normalizeUserRoles(user, ["secretaria"]),
      }))
    );
  }, []);

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

        await loadUsers(storedActiveRole);
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
        alert("No se pudieron cargar los usuarios.");
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
        return;
      }

      setIsLoading(true);
      loadUsers(nextActiveRole)
        .catch((error) => {
          console.error("Error al cargar usuarios:", error);
          alert("No se pudieron cargar los usuarios.");
        })
        .finally(() => setIsLoading(false));
    };

    window.addEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);

    return () => {
      window.removeEventListener(ACTIVE_ROLE_CHANGED_EVENT, handleActiveRoleChange);
    };
  }, [loadUsers, router]);

  const updateUserRoles = async (userId: string, roles: UserRole[]) => {
    if (roles.length === 0) {
      alert("El usuario debe tener al menos un rol.");
      return;
    }

    if (currentUser?.id === userId && !roles.includes("admin")) {
      alert("No podes quitarte tu propio rol admin.");
      return;
    }

    const previousUsers = users;
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, role: roles[0], roles } : user))
    );

    setIsSaving(true);
    try {
      const response = await fetch("/api/usuarios/role", {
        method: "PATCH",
        headers: {
          ...activeRoleJsonHeaders(pb.authStore.token, activeRole),
        },
        body: JSON.stringify({ userId, roles }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo actualizar el rol del usuario.");
      }

      const updated = await response.json();
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, role: updated.role, roles: normalizeUserRoles(updated, roles) }
            : user
        )
      );
      if (currentUser?.id === userId) {
        setCurrentUser((prev) =>
          prev ? { ...prev, role: updated.role, roles: normalizeUserRoles(updated, roles) } : prev
        );
      }
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      setUsers(previousUsers);
      alert(error instanceof Error ? error.message : "No se pudo actualizar el rol del usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createUserForm.roles.length === 0) {
      alert("Selecciona al menos un rol.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          ...activeRoleJsonHeaders(pb.authStore.token, activeRole),
        },
        body: JSON.stringify(createUserForm),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo crear el usuario");
      }

      const created = await response.json();
      setUsers((prev) =>
        [
          ...prev,
          {
            ...created,
            roles: normalizeUserRoles(created, createUserForm.roles),
          },
        ].sort((a, b) => a.email.localeCompare(b.email))
      );
      setCreateUserForm(emptyCreateUserForm);
      setIsCreatingUser(false);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      alert(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (user: ManagedUser) => {
    if (currentUser?.id === user.id) {
      alert("No podes eliminar tu propio usuario.");
      return;
    }

    const userLabel = user.name ? `${user.name} (${user.email})` : user.email;
    if (!window.confirm(`Vas a eliminar el usuario ${userLabel}. Esta accion no se puede deshacer. ¿Continuar?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/usuarios", {
        method: "DELETE",
        headers: {
          ...activeRoleJsonHeaders(pb.authStore.token, activeRole),
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo eliminar el usuario.");
      }

      setUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCreateUserRole = (role: UserRole) => {
    setCreateUserForm((prev) => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter((item) => item !== role)
        : [...prev.roles, role];

      if (roles.length === 0) {
        alert("El usuario debe tener al menos un rol.");
        return prev;
      }

      return { ...prev, roles };
    });
  };

  const toggleUserRole = (user: ManagedUser, role: UserRole) => {
    const currentRoles = normalizeUserRoles(user, ["secretaria"]);
    const nextRoles = currentRoles.includes(role)
      ? currentRoles.filter((item) => item !== role)
      : [...currentRoles, role];
    const roles = USER_ROLES.filter((item) => nextRoles.includes(item));

    if (roles.length === 0) {
      alert("El usuario debe tener al menos un rol.");
      return;
    }

    if (currentUser?.id === user.id && role === "admin" && currentRoles.includes("admin")) {
      alert("No podes quitarte tu propio rol admin.");
      return;
    }

    updateUserRoles(user.id, roles);
  };

  if (!isMounted || !currentUser) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Cargando usuarios...
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Usuarios</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Gestiona usuarios y roles de acceso</p>
          </div>
        </div>

        <section className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Listado de usuarios</h2>
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
                  <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Roles *</span>
                  <div className="flex flex-wrap gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 min-h-10">
                    {USER_ROLES.map((role) => (
                      <label key={role} className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={createUserForm.roles.includes(role)}
                          onChange={() => toggleCreateUserRole(role)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        {ROLE_LABELS[role]}
                      </label>
                    ))}
                  </div>
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
                  <th className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Roles</th>
                  <th className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400 text-right">Acciones</th>
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
                      <div className="flex flex-wrap gap-3">
                        {USER_ROLES.map((role) => {
                          const roles = normalizeUserRoles(user, ["secretaria"]);
                          const isOwnAdminRole =
                            currentUser?.id === user.id && role === "admin" && roles.includes("admin");
                          return (
                            <label key={role} className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                              <input
                                type="checkbox"
                                checked={roles.includes(role)}
                                onChange={() => toggleUserRole(user, role)}
                                disabled={isSaving || isOwnAdminRole}
                                title={isOwnAdminRole ? "No podes quitarte tu propio rol admin" : undefined}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              {ROLE_LABELS[role]}
                            </label>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {currentUser?.id === user.id ? (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Cuenta activa</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => deleteUser(user)}
                          disabled={isSaving}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
