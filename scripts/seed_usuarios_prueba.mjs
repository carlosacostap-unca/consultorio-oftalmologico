import fs from "node:fs";
import { assertTestingPocketBaseUrl, envFileFromArgs, hasFlag, pocketBaseUrl } from "./env_utils.mjs";

const envFile = envFileFromArgs(".env.local");
const env = loadEnv(envFile);
const PB_URL = pocketBaseUrl({ ...process.env, ...env }) || requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL);
assertTestingPocketBaseUrl(PB_URL, { requireTest: hasFlag("--require-test-pocketbase") || process.env.REQUIRE_TEST_POCKETBASE === "true" });
const PASSWORD = env.DEMO_USER_PASSWORD || process.env.DEMO_USER_PASSWORD || "Consultorio123!";

const DEMO_USERS = [
  {
    email: "admin.demo@consultorio.local",
    name: "Admin Demo",
    roles: ["admin"],
  },
  {
    email: "medico.demo@consultorio.local",
    name: "Medico Demo",
    roles: ["medico"],
  },
  {
    email: "medico.dos.demo@consultorio.local",
    name: "Medico Dos Demo",
    roles: ["medico"],
  },
  {
    email: "secretaria.demo@consultorio.local",
    name: "Secretaria Demo",
    roles: ["secretaria"],
  },
  {
    email: "admin.secretaria.demo@consultorio.local",
    name: "Admin Secretaria Demo",
    roles: ["admin", "secretaria"],
  },
  {
    email: "multi.demo@consultorio.local",
    name: "Multi Rol Demo",
    roles: ["medico", "secretaria"],
  },
];

const token = await adminToken();

for (const user of DEMO_USERS) {
  await upsertUser(user);
}

console.log("Usuarios de prueba listos:");
for (const user of DEMO_USERS) {
  console.log(`- ${user.email} / ${PASSWORD} / roles: ${user.roles.join(", ")}`);
}

async function upsertUser(user) {
  const existing = await findFirstRecord("users", `email = "${user.email}"`);
  const role = legacyRoleForRoles(user.roles);
  const data = {
    email: user.email,
    name: user.name,
    role,
    roles: user.roles,
    verified: true,
    emailVisibility: true,
  };

  if (existing) {
    await pb(`/api/collections/users/records/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...data,
        password: PASSWORD,
        passwordConfirm: PASSWORD,
      }),
    });
    console.log(`Actualizado ${user.email}`);
    return;
  }

  await pb("/api/collections/users/records", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      password: PASSWORD,
      passwordConfirm: PASSWORD,
    }),
  });
  console.log(`Creado ${user.email}`);
}

async function findFirstRecord(collection, filter) {
  const params = new URLSearchParams({ page: "1", perPage: "1", filter });
  const result = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
  return result.items?.[0] || null;
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
    throw new Error(`Configura POCKETBASE_ADMIN_TOKEN o POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD en ${envFile}`);
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

function legacyRoleForRoles(roles) {
  return roles.includes("admin") ? "admin" : roles[0] || "secretaria";
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
