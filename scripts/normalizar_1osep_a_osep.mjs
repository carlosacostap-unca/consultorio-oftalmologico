import fs from "node:fs";

const env = loadEnv(".env.local");
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const PER_PAGE = 200;

const token = await adminToken();

const before1Osep = await countPacientes('obra_social = "1OSEP"');
const beforeOsep = await countPacientes('obra_social = "OSEP"');

console.log("--- Normalizacion 1OSEP -> OSEP ---");
console.log(`Antes: 1OSEP=${before1Osep}, OSEP=${beforeOsep}`);

let updated = 0;
let page = 1;
let totalPages = 1;

do {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(PER_PAGE),
    filter: 'obra_social = "1OSEP"',
    fields: "id,obra_social",
  });

  const result = await pb(`/api/collections/pacientes/records?${params}`);
  totalPages = result.totalPages;

  for (const paciente of result.items) {
    await pb(`/api/collections/pacientes/records/${encodeURIComponent(paciente.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ obra_social: "OSEP" }),
    });
    updated += 1;
  }

  console.log(`Actualizados ${updated}/${before1Osep}`);
} while (page < totalPages);

const after1Osep = await countPacientes('obra_social = "1OSEP"');
const afterOsep = await countPacientes('obra_social = "OSEP"');

console.log(`Despues: 1OSEP=${after1Osep}, OSEP=${afterOsep}`);
console.log(`Registros actualizados: ${updated}`);

async function countPacientes(filter) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    filter,
  });

  const result = await pb(`/api/collections/pacientes/records?${params}`);
  return result.totalItems;
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
  if (env.POCKETBASE_ADMIN_TOKEN) {
    return env.POCKETBASE_ADMIN_TOKEN;
  }

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
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
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
