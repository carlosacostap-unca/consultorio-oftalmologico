import fs from "node:fs";

const env = loadEnv(".env.local");
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const ROLES = ["admin", "medico", "secretaria"];
const DEFAULT_ROLE_PERMISSIONS = {
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

const token = await adminToken();
await ensureUsersRoleField();
await assignExistingUsersAdmin();
await ensureRolePermissionsCollection();
await ensureDefaultRolePermissionRecords();

console.log("Migracion de roles y permisos finalizada.");

async function ensureUsersRoleField() {
  const users = await getCollection("users");
  if (users.fields.some((field) => field.name === "role")) {
    console.log("users.role ya existe.");
    return;
  }

  console.log("Creando campo users.role...");
  await updateCollection("users", {
    fields: [
      ...users.fields,
      {
        hidden: false,
        maxSelect: 1,
        name: "role",
        presentable: false,
        required: false,
        system: false,
        type: "select",
        values: ROLES,
      },
    ],
  });
}

async function assignExistingUsersAdmin() {
  const users = await listAllRecords("users");
  let updated = 0;

  for (const user of users) {
    if (user.role !== "admin") {
      await pb(`/api/collections/users/records/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      });
      updated += 1;
    }
  }

  console.log(`Usuarios existentes asignados como admin: ${updated}/${users.length}`);
}

async function ensureRolePermissionsCollection() {
  const existing = await findCollection("role_permissions");
  if (existing) {
    console.log("role_permissions ya existe.");
    return;
  }

  console.log("Creando coleccion role_permissions...");
  await pb("/api/collections", {
    method: "POST",
    body: JSON.stringify({
      name: "role_permissions",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          hidden: false,
          maxSelect: 1,
          name: "role",
          presentable: false,
          required: true,
          system: false,
          type: "select",
          values: ["medico", "secretaria"],
        },
        {
          hidden: false,
          maxSize: 2000000,
          name: "permissions",
          presentable: false,
          required: false,
          system: false,
          type: "json",
        },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_role_permissions_role ON role_permissions (role)"],
    }),
  });
}

async function ensureDefaultRolePermissionRecords() {
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const existing = await findFirstRecord("role_permissions", `role = "${role}"`);
    if (existing) {
      console.log(`Permisos de ${role} ya existen.`);
      continue;
    }

    await pb("/api/collections/role_permissions/records", {
      method: "POST",
      body: JSON.stringify({ role, permissions }),
    });
    console.log(`Permisos iniciales creados para ${role}.`);
  }
}

async function findCollection(name) {
  const params = new URLSearchParams({ page: "1", perPage: "1", filter: `name = "${name}"` });
  const result = await pb(`/api/collections?${params}`);
  return result.items?.[0] || null;
}

async function getCollection(name) {
  return pb(`/api/collections/${encodeURIComponent(name)}`);
}

async function updateCollection(name, data) {
  return pb(`/api/collections/${encodeURIComponent(name)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

async function findFirstRecord(collection, filter) {
  const params = new URLSearchParams({ page: "1", perPage: "1", filter });
  const result = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
  return result.items?.[0] || null;
}

async function listAllRecords(collection) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({ page: String(page), perPage: "200" });
    const result = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
    items.push(...result.items);
    totalPages = result.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function pb(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${PB_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(`PocketBase ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function adminToken() {
  if (env.POCKETBASE_ADMIN_TOKEN) return env.POCKETBASE_ADMIN_TOKEN;

  if (!env.POCKETBASE_ADMIN_EMAIL || !env.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error("Configura POCKETBASE_ADMIN_TOKEN o POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD en .env.local");
  }

  const body = JSON.stringify({
    identity: env.POCKETBASE_ADMIN_EMAIL,
    password: env.POCKETBASE_ADMIN_PASSWORD,
  });

  let response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    response = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  }

  if (!response.ok) {
    throw new Error(`No se pudo autenticar contra PocketBase: ${response.status} ${await response.text()}`);
  }

  return (await response.json()).token;
}

function loadEnv(path) {
  if (!fs.existsSync(path)) return {};
  const result = {};

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function requiredEnv(name, fallback = "") {
  const value = env[name] || process.env[name] || fallback;
  if (!value) throw new Error(`${name} es requerido`);
  return value;
}
