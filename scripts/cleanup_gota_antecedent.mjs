import {
  envFileFromArgs,
  loadEnvFile,
  pocketBaseUrl,
} from "./env_utils.mjs";

const envFile = envFileFromArgs(".env.local");
const env = loadEnvFile(envFile, { required: true });
const PB_URL = pocketBaseUrl({ ...process.env, ...env });
const PER_PAGE = 200;

if (!PB_URL) {
  throw new Error("POCKETBASE_URL o NEXT_PUBLIC_POCKETBASE_URL es requerido.");
}

const token = await adminToken(PB_URL, env, envFile);

const pacientes = await cleanupCollection("pacientes");
const consultas = await cleanupCollection("consultas");

console.log(`Limpieza de Gota finalizada. Pacientes actualizados: ${pacientes}. Consultas actualizadas: ${consultas}.`);

async function cleanupCollection(collection) {
  let updated = 0;

  while (true) {
    const records = await listRecords(collection);
    if (records.length === 0) return updated;

    for (const record of records) {
      await pb(`/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ ant_gota: false }),
      });
      updated += 1;
    }
  }
}

async function listRecords(collection) {
  const params = new URLSearchParams({
    page: "1",
    perPage: String(PER_PAGE),
    filter: "ant_gota = true",
    fields: "id",
  });

  const response = await fetch(`${PB_URL}/api/collections/${encodeURIComponent(collection)}/records?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`PocketBase ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

async function adminToken(url, envValues, envPath) {
  if (envValues.POCKETBASE_ADMIN_TOKEN) return envValues.POCKETBASE_ADMIN_TOKEN;

  if (!envValues.POCKETBASE_ADMIN_EMAIL || !envValues.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura POCKETBASE_ADMIN_TOKEN o POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD en ${envPath}`);
  }

  const body = JSON.stringify({
    identity: envValues.POCKETBASE_ADMIN_EMAIL,
    password: envValues.POCKETBASE_ADMIN_PASSWORD,
  });

  for (const path of ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]) {
    const response = await fetch(`${url}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) {
      return (await response.json()).token;
    }
  }

  throw new Error(`No se pudo autenticar contra PocketBase usando ${envPath}`);
}

async function pb(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${PB_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(`PocketBase ${response.status}: ${await response.text()}`);
  }

  if (response.status === 204) return null;
  return response.json();
}
