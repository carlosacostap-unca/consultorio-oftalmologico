import fs from "node:fs";

const env = loadEnv(".env.local");
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const PER_PAGE = 200;
const CONCURRENCY = 20;

const token = await adminToken();

let pacientesCollection = await getCollection("pacientes");
const mutualesCollection = await getCollection("mutuales");

if (!pacientesCollection.fields.some((field) => field.name === "mutual_id")) {
  console.log("Creando campo relation pacientes.mutual_id -> mutuales...");
  await updateCollection("pacientes", {
    fields: [
      ...pacientesCollection.fields,
      {
        cascadeDelete: false,
        collectionId: mutualesCollection.id,
        hidden: false,
        maxSelect: 1,
        minSelect: 0,
        name: "mutual_id",
        presentable: false,
        required: false,
        system: false,
        type: "relation",
      },
    ],
  });
  pacientesCollection = await getCollection("pacientes");
} else {
  console.log("El campo pacientes.mutual_id ya existe.");
}

const mutuales = await listAll("mutuales", { sort: "nombre,codigo" });
const mutualesByName = new Map();

for (const mutual of mutuales) {
  const key = normalizeName(mutual.nombre);
  if (!key) continue;
  if (!mutualesByName.has(key)) mutualesByName.set(key, []);
  mutualesByName.get(key).push(mutual);
}

const canonicalByName = new Map();
const duplicateGroups = [];

for (const [key, items] of mutualesByName) {
  const sorted = [...items].sort(compareMutuales);
  canonicalByName.set(key, sorted[0]);
  if (sorted.length > 1) {
    duplicateGroups.push({ key, canonical: sorted[0], duplicates: sorted.slice(1) });
  }
}

console.log(`Mutuales leidas: ${mutuales.length}`);
console.log(`Nombres de mutual duplicados: ${duplicateGroups.length}`);
for (const group of duplicateGroups) {
  const duplicates = group.duplicates.map((mutual) => `${mutual.nombre} codigo ${mutual.codigo} (${mutual.id})`).join(", ");
  console.log(`  ${group.key}: canonica codigo ${group.canonical.codigo} (${group.canonical.id}); duplicadas: ${duplicates}`);
}

const totalPatients = await countPacientes();
let inspected = 0;
let updated = 0;
let skippedWithoutMatch = 0;
let failed = 0;
let page = 1;
let totalPages = 1;

console.log(`Pacientes a revisar: ${totalPatients}`);

do {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(PER_PAGE),
    sort: "created",
    fields: "id,obra_social,mutual_id",
  });

  const result = await pb(`/api/collections/pacientes/records?${params}`);
  totalPages = result.totalPages;
  inspected += result.items.length;

  const updates = [];

  for (const paciente of result.items) {
    const key = normalizeName(paciente.obra_social);
    const mutual = canonicalByName.get(key);

    if (!mutual) {
      skippedWithoutMatch += 1;
      continue;
    }

    if (paciente.mutual_id === mutual.id) {
      continue;
    }

    updates.push(() =>
      pb(`/api/collections/pacientes/records/${encodeURIComponent(paciente.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ mutual_id: mutual.id }),
      }),
    );
  }

  const results = await runWithConcurrency(updates, CONCURRENCY);
  updated += results.success;
  failed += results.failed;

  console.log(`Pagina ${page}/${totalPages}: revisados=${inspected}/${totalPatients}, actualizados=${updated}, sinMatch=${skippedWithoutMatch}, errores=${failed}`);
  page += 1;
} while (page <= totalPages);

const withRelation = await countPacientes('mutual_id != ""');
const withoutRelation = await countPacientes('mutual_id = ""');

console.log("\n--- Resultado ---");
console.log(`Pacientes revisados: ${inspected}`);
console.log(`Pacientes actualizados: ${updated}`);
console.log(`Pacientes sin match: ${skippedWithoutMatch}`);
console.log(`Errores: ${failed}`);
console.log(`Pacientes con mutual_id: ${withRelation}`);
console.log(`Pacientes sin mutual_id: ${withoutRelation}`);

if (failed > 0) {
  process.exitCode = 1;
}

async function runWithConcurrency(tasks, concurrency) {
  let index = 0;
  let success = 0;
  let failedCount = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = tasks[index];
      index += 1;
      try {
        await current();
        success += 1;
      } catch (error) {
        failedCount += 1;
        console.error(`Error al actualizar paciente: ${error.message}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);

  return { success, failed: failedCount };
}

async function countPacientes(filter = "") {
  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
  });

  if (filter) params.set("filter", filter);

  const result = await pb(`/api/collections/pacientes/records?${params}`);
  return result.totalItems;
}

async function listAll(collection, options = {}) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE),
    });

    if (options.sort) params.set("sort", options.sort);

    const data = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
    items.push(...data.items);
    totalPages = data.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function getCollection(collection) {
  return pb(`/api/collections/${encodeURIComponent(collection)}`);
}

async function updateCollection(collection, data) {
  return pb(`/api/collections/${encodeURIComponent(collection)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
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

function compareMutuales(a, b) {
  const aCode = Number.parseInt(a.codigo, 10);
  const bCode = Number.parseInt(b.codigo, 10);

  if (Number.isFinite(aCode) && Number.isFinite(bCode) && aCode !== bCode) {
    return aCode - bCode;
  }

  if (Number.isFinite(aCode) && !Number.isFinite(bCode)) return -1;
  if (!Number.isFinite(aCode) && Number.isFinite(bCode)) return 1;

  return String(a.created || "").localeCompare(String(b.created || ""));
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
