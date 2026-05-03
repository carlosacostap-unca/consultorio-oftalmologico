export type UserRole = "admin" | "medico" | "secretaria";
export type ManagedRole = Exclude<UserRole, "admin">;

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
