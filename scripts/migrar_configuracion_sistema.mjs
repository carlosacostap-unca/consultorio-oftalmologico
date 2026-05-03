import fs from "node:fs";

const env = loadEnv(".env.local");
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const token = await adminToken();

await ensureSystemSettingsCollection();
await ensureConsultaEditLimitDays();

console.log("Migracion de configuracion del sistema finalizada.");

async function ensureSystemSettingsCollection() {
  const existing = await findCollection("system_settings");
  if (existing) {
    console.log("system_settings ya existe.");
    return;
  }

  console.log("Creando coleccion system_settings...");
  await pb("/api/collections", {
    method: "POST",
    body: JSON.stringify({
      name: "system_settings",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          hidden: false,
          max: 120,
          min: 1,
          name: "key",
          pattern: "",
          presentable: true,
          required: true,
          system: false,
          type: "text",
        },
        {
          hidden: false,
          maxSize: 2000000,
          name: "value",
          presentable: false,
          required: false,
          system: false,
          type: "json",
        },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_system_settings_key ON system_settings (`key`)"],
    }),
  });
}

async function ensureConsultaEditLimitDays() {
  const existing = await findFirstRecord("system_settings", 'key = "consulta_edit_limit_days"');
  if (existing) {
    console.log("consulta_edit_limit_days ya existe.");
    return;
  }

  await pb("/api/collections/system_settings/records", {
    method: "POST",
    body: JSON.stringify({ key: "consulta_edit_limit_days", value: 7 }),
  });
  console.log("consulta_edit_limit_days creado con valor inicial 7.");
}

async function findCollection(name) {
  const params = new URLSearchParams({ page: "1", perPage: "1", filter: `name = "${name}"` });
  const result = await pb(`/api/collections?${params}`);
  return result.items?.[0] || null;
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
