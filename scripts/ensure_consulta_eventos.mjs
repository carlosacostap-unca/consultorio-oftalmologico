import {
  assertTestingPocketBaseUrl,
  envFileFromArgs,
  hasFlag,
  loadEnvFile,
  pocketBaseUrl,
} from "./env_utils.mjs";

const envFile = envFileFromArgs(".env.local");
const env = loadEnvFile(envFile, { required: true });
const PB_URL = pocketBaseUrl({ ...process.env, ...env });

assertTestingPocketBaseUrl(PB_URL, {
  requireTest: hasFlag("--require-test-pocketbase") || process.env.REQUIRE_TEST_POCKETBASE === "true",
});

const token = await adminToken(PB_URL, env, envFile);
const consultas = await collectionByName("consultas");
const pacientes = await collectionByName("pacientes");
const users = await collectionByName("users");
const existing = await maybeCollectionByName("consulta_eventos");
const payload = collectionPayload(consultas.id, pacientes.id, users.id);

if (existing) {
  await pb(`/api/collections/${encodeURIComponent(existing.id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  console.log("Actualizada coleccion consulta_eventos");
} else {
  await pb("/api/collections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log("Creada coleccion consulta_eventos");
}

function collectionPayload(consultasCollectionId, pacientesCollectionId, usersCollectionId) {
  return {
    name: "consulta_eventos",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null,
    fields: [
      relationField("consulta_id", consultasCollectionId, { required: true }),
      relationField("paciente_id", pacientesCollectionId),
      relationField("actor_id", usersCollectionId),
      textField("actor_nombre"),
      selectField("tipo", ["created", "updated", "status_changed"]),
      textField("titulo"),
      textField("detalle"),
      jsonField("metadata"),
      autodateField("created", { onCreate: true, onUpdate: false }),
      autodateField("updated", { onCreate: true, onUpdate: true }),
    ],
    indexes: [],
  };
}

function relationField(name, collectionId, options = {}) {
  return {
    name,
    type: "relation",
    required: Boolean(options.required),
    hidden: false,
    presentable: false,
    collectionId,
    cascadeDelete: false,
    minSelect: 0,
    maxSelect: 1,
  };
}

function textField(name) {
  return {
    name,
    type: "text",
    required: false,
    hidden: false,
    presentable: false,
    min: 0,
    max: 0,
    pattern: "",
    autogeneratePattern: "",
    primaryKey: false,
  };
}

function selectField(name, values) {
  return {
    name,
    type: "select",
    required: false,
    hidden: false,
    presentable: false,
    maxSelect: 1,
    values,
  };
}

function jsonField(name) {
  return {
    name,
    type: "json",
    required: false,
    hidden: false,
    presentable: false,
    maxSize: 0,
  };
}

function autodateField(name, options) {
  return {
    name,
    type: "autodate",
    hidden: false,
    presentable: false,
    onCreate: options.onCreate,
    onUpdate: options.onUpdate,
  };
}

async function collectionByName(name) {
  const collection = await maybeCollectionByName(name);
  if (!collection) throw new Error(`No existe la coleccion requerida ${name}`);
  return collection;
}

async function maybeCollectionByName(name) {
  const response = await fetch(`${PB_URL}/api/collections/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`PocketBase ${response.status}: ${await response.text()}`);

  return response.json();
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

  return response.json();
}
