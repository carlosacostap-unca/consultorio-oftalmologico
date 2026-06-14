import fs from "node:fs";
import {
  envFileFromArgs,
  loadEnvFile,
  normalizePocketBaseUrl,
  pocketBaseUrl,
} from "./env_utils.mjs";

export function adminEnvFromArgs(defaultPath = ".env.local") {
  const envFile = envFileFromArgs(defaultPath);
  const fileEnv = loadEnvFile(envFile, { required: true });
  const env = { ...process.env, ...fileEnv };
  const url = pocketBaseUrl(env);

  if (!url) {
    throw new Error(`Configura POCKETBASE_URL o NEXT_PUBLIC_POCKETBASE_URL en ${envFile}.`);
  }

  return { envFile, env, url };
}

export function looksProductionPocketBaseUrl(url) {
  const normalized = normalizePocketBaseUrl(url).toLowerCase();
  return normalized.includes("pocketbase-consultorio-oftalmologico.acostaparra.com");
}

export async function createPocketBaseAdminClient({ url, env, envFile, name = "PocketBase" }) {
  const normalizedUrl = normalizePocketBaseUrl(url);
  const token = await adminToken(normalizedUrl, env, envFile);

  async function request(path, options = {}) {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    const response = await fetch(`${normalizedUrl}${path}`, { ...options, headers });
    if (!response.ok) {
      throw new Error(`${name} ${response.status}: ${await response.text()}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async function listAll(collection, options = {}) {
    const items = [];
    let page = 1;
    let totalPages = 1;
    const perPage = options.perPage || 500;

    do {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
      });

      if (options.sort) params.set("sort", options.sort);
      if (options.filter) params.set("filter", options.filter);
      if (options.fields) params.set("fields", options.fields);
      if (options.expand) params.set("expand", options.expand);

      const data = await request(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
      items.push(...data.items);
      totalPages = data.totalPages;
      page += 1;
    } while (page <= totalPages);

    return items;
  }

  async function count(collection, filter = "") {
    const params = new URLSearchParams({ page: "1", perPage: "1" });
    if (filter) params.set("filter", filter);
    const data = await request(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
    return data.totalItems;
  }

  return {
    url: normalizedUrl,
    token,
    request,
    listAll,
    count,
    create: (collection, payload) =>
      request(`/api/collections/${encodeURIComponent(collection)}/records`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    delete: (collection, id) =>
      request(`/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  };
}

export function writeBackupFile(path, data) {
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function adminToken(url, env, envFile) {
  if (env.POCKETBASE_ADMIN_TOKEN) return env.POCKETBASE_ADMIN_TOKEN;

  if (!env.POCKETBASE_ADMIN_EMAIL || !env.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura POCKETBASE_ADMIN_TOKEN o POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD en ${envFile}.`);
  }

  const body = JSON.stringify({
    identity: env.POCKETBASE_ADMIN_EMAIL,
    password: env.POCKETBASE_ADMIN_PASSWORD,
  });

  for (const authPath of ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]) {
    const response = await fetch(`${url}${authPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) {
      return (await response.json()).token;
    }
  }

  throw new Error(`No se pudo autenticar contra PocketBase usando ${envFile}.`);
}
