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
const users = await collectionByName("users");

await ensureRelationField("consultas", "medico_id", users.id);
await ensureRelationField("recetas", "medico_id", users.id);

console.log("Schema de atribucion medica clinica listo. No se modificaron registros existentes.");

async function ensureRelationField(collectionName, fieldName, targetCollectionId) {
  const collection = await collectionByName(collectionName);
  const fields = collection.fields.filter((field) => !field.system).map(cleanField);
  const existingIndex = fields.findIndex((field) => field.name === fieldName);
  const fieldPayload = relationField(fieldName, targetCollectionId);

  if (existingIndex === -1) {
    fields.push(fieldPayload);
  } else {
    fields[existingIndex] = { ...fields[existingIndex], ...fieldPayload };
  }

  await pb(`/api/collections/${encodeURIComponent(collection.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: collection.name,
      type: collection.type,
      listRule: collection.listRule,
      viewRule: collection.viewRule,
      createRule: collection.createRule,
      updateRule: collection.updateRule,
      deleteRule: collection.deleteRule,
      fields,
      indexes: collection.indexes || [],
    }),
  });

  console.log(`Asegurado ${collectionName}.${fieldName}`);
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
