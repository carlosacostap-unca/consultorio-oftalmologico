export type UserRole = "admin" | "medico" | "secretaria";
export type ManagedRole = Exclude<UserRole, "admin">;

export const USER_ROLES: UserRole[] = ["admin", "medico", "secretaria"];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  medico: "Medico",
  secretaria: "Secretaria",
};

export const MANAGED_ROLES: ManagedRole[] = ["medico", "secretaria"];

export const PERMISSION_GROUPS = [
  {
    title: "Pacientes",
    permissions: [
      { key: "pacientes.view", label: "Ver pacientes" },
      { key: "pacientes.create", label: "Crear pacientes" },
      { key: "pacientes.edit", label: "Editar pacientes" },
      { key: "pacientes.delete", label: "Eliminar pacientes" },
    ],
  },
  {
    title: "Consultas",
    permissions: [
      { key: "consultas.view", label: "Ver consultas" },
      { key: "consultas.create", label: "Crear consultas" },
      { key: "consultas.edit", label: "Editar consultas" },
      { key: "consultas.delete", label: "Eliminar consultas" },
    ],
  },
  {
    title: "Turnos",
    permissions: [
      { key: "turnos.view", label: "Ver turnos" },
      { key: "turnos.create", label: "Crear turnos" },
      { key: "turnos.edit", label: "Editar turnos" },
      { key: "turnos.delete", label: "Eliminar turnos" },
    ],
  },
  {
    title: "Administracion",
    permissions: [
      { key: "mutuales.manage", label: "Gestionar mutuales" },
      { key: "recetas.manage", label: "Gestionar recetas" },
    ],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key)
);

export const DEFAULT_ROLE_PERMISSIONS: Record<ManagedRole, PermissionKey[]> = {
  medico: [
    "pacientes.view",
    "pacientes.create",
    "pacientes.edit",
    "consultas.view",
    "consultas.create",
    "consultas.edit",
    "turnos.view",
    "recetas.manage",
  ],
  secretaria: [
    "pacientes.view",
    "pacientes.create",
    "pacientes.edit",
    "turnos.view",
    "turnos.create",
    "turnos.edit",
    "mutuales.manage",
  ],
};

export interface RoleLikeRecord {
  role?: unknown;
  roles?: unknown;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function isManagedRole(role: unknown): role is ManagedRole {
  return MANAGED_ROLES.includes(role as ManagedRole);
}

export function normalizeUserRoles(record: RoleLikeRecord | null | undefined, fallback: UserRole[] = []): UserRole[] {
  const roles = sanitizeUserRoles(record?.roles);
  if (roles.length > 0) return roles;

  const legacyRole = isUserRole(record?.role) ? record.role : null;
  if (legacyRole) return [legacyRole];

  return [...fallback];
}

export function normalizeRoleInput(input: RoleLikeRecord): UserRole[] {
  return normalizeUserRoles(input);
}

export function sanitizeUserRoles(value: unknown): UserRole[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return Array.from(new Set(values.filter(isUserRole)));
}

export function hasAdminRole(record: RoleLikeRecord | null | undefined): boolean {
  return normalizeUserRoles(record).includes("admin");
}

export function legacyRoleForRoles(roles: readonly UserRole[]): UserRole {
  return roles.includes("admin") ? "admin" : roles[0] || "secretaria";
}

export function effectivePermissionsForRoles(
  roles: readonly UserRole[],
  rolePermissions: Partial<Record<ManagedRole, readonly PermissionKey[]>> = DEFAULT_ROLE_PERMISSIONS
): PermissionKey[] {
  const permissions = new Set<PermissionKey>();

  for (const role of roles) {
    if (!isManagedRole(role)) continue;

    for (const permission of rolePermissions[role] || DEFAULT_ROLE_PERMISSIONS[role]) {
      permissions.add(permission);
    }
  }

  return Array.from(permissions);
}
