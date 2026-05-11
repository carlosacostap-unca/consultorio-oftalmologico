import fs from "node:fs";

const env = loadEnv(".env.local");
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const PER_PAGE = 200;

const token = await adminToken();

const usersCollection = await getCollection("users");
await ensureRelationField("disponibilidades", "medico_id", usersCollection.id);
await ensureRelationField("turnos", "medico_id", usersCollection.id);

const medicos = await listAll("users");
const agendaMedicos = medicos.filter((user) => hasMedicoRole(user));

console.log(`Medicos agendables encontrados: ${agendaMedicos.length}`);

if (agendaMedicos.length === 1) {
  const medicoId = agendaMedicos[0].id;
  console.log(`Asignando registros existentes sin medico_id al unico medico: ${agendaMedicos[0].name || agendaMedicos[0].email || medicoId}`);
  await assignMissingDoctor("disponibilidades", medicoId);
  await assignMissingDoctor("turnos", medicoId);
} else {
  console.log("Hay cero o multiples medicos agendables; no se asignan datos existentes automaticamente.");
  await reportMissingDoctor("disponibilidades");
  await reportMissingDoctor("turnos");
}

console.log("Migracion de medico en agenda finalizada.");

async function ensureRelationField(collectionName, fieldName, targetCollectionId) {
  const collection = await getCollection(collectionName);
  const existing = collection.fields.find((field) => field.name === fieldName);

  if (existing) {
    console.log(`${collectionName}.${fieldName} ya existe.`);
    return;
  }

  console.log(`Creando campo relation ${collectionName}.${fieldName} -> users...`);
  await updateCollection(collectionName, {
    fields: [
      ...collection.fields,
      {
        cascadeDelete: false,
        collectionId: targetCollectionId,
        hidden: false,
        maxSelect: 1,
        minSelect: 0,
        name: fieldName,
        presentable: false,
        required: false,
        system: false,
        type: "relation",
      },
    ],
  });
}

async function assignMissingDoctor(collectionName, medicoId) {
  const records = await listAll(collectionName, { filter: 'medico_id = ""' });
  let updated = 0;

  for (const record of records) {
    await pb(`/api/collections/${encodeURIComponent(collectionName)}/records/${encodeURIComponent(record.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ medico_id: medicoId }),
    });
    updated += 1;
  }

  console.log(`${collectionName}: ${updated} registros actualizados con medico_id.`);
}

async function reportMissingDoctor(collectionName) {
  const records = await listAll(collectionName, { filter: 'medico_id = ""' });
  console.log(`${collectionName}: ${records.length} registros quedan pendientes sin medico_id.`);
}

function hasMedicoRole(user) {
  const roles = Array.isArray(user.roles) ? user.roles : typeof user.roles === "string" ? [user.roles] : [];
  return roles.includes("medico") || user.role === "medico";
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

    if (options.filter) params.set("filter", options.filter);
    if (options.sort) params.set("sort", options.sort);

    const data = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
    items.push(...data.items);
    totalPages = data.totalPages || 1;
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
