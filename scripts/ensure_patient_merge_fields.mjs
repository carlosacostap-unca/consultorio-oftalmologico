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
const pacientes = await collectionByName("pacientes");
const users = await collectionByName("users");
const existingNames = new Set(pacientes.fields.map((field) => field.name));
const fieldsToAdd = [
  textField("estado_registro"),
  relationField("fusionado_en_paciente_id", pacientes.id),
  dateField("fusionado_at"),
  relationField("fusionado_por", users.id),
  textField("fusion_motivo"),
];
const nextFields = [
  ...pacientes.fields.filter((field) => !field.system),
  ...fieldsToAdd.filter((field) => !existingNames.has(field.name)),
];

await pb(`/api/collections/${encodeURIComponent(pacientes.id)}`, {
  method: "PATCH",
  body: JSON.stringify({
    ...collectionPayload(pacientes),
    fields: nextFields,
  }),
});

console.log("Campos de fusion de pacientes listos.");

function collectionPayload(collection) {
  return {
    name: collection.name,
    type: collection.type,
    listRule: collection.listRule,
    viewRule: collection.viewRule,
    createRule: collection.createRule,
    updateRule: collection.updateRule,
    deleteRule: collection.deleteRule,
    indexes: collection.indexes || [],
  };
}

function relationField(name, collectionId) {
  return {
    name,
    type: "relation",
    required: false,
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

function dateField(name) {
  return {
    name,
    type: "date",
    required: false,
    hidden: false,
    presentable: false,
    min: "",
    max: "",
  };
}

async function collectionByName(name) {
  const response = await fetch(`${PB_URL}/api/collections/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

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
