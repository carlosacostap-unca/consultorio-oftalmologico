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
const fields = consultas.fields.filter((field) => !field.system).map(cleanField);
const estadoField = selectField("estado", ["borrador", "en_curso", "finalizada", "anulada"]);
const existingIndex = fields.findIndex((field) => field.name === "estado");

if (existingIndex === -1) {
  fields.push(estadoField);
} else {
  fields[existingIndex] = { ...fields[existingIndex], ...estadoField };
}

await pb(`/api/collections/${encodeURIComponent(consultas.id)}`, {
  method: "PATCH",
  body: JSON.stringify({
    name: consultas.name,
    type: consultas.type,
    listRule: consultas.listRule,
    viewRule: consultas.viewRule,
    createRule: consultas.createRule,
    updateRule: consultas.updateRule,
    deleteRule: consultas.deleteRule,
    fields,
    indexes: consultas.indexes || [],
  }),
});

console.log("Asegurado campo estado en consultas");

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

function cleanField(field) {
  const cleaned = { ...field };
  delete cleaned.created;
  delete cleaned.updated;

  return cleaned;
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
