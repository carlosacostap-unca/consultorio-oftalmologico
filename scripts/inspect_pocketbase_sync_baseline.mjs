import { createHash } from "node:crypto";
import { envFileFromArgs, loadEnvFile, pocketBaseUrl } from "./env_utils.mjs";

const envFile = envFileFromArgs(".env.local");
const env = loadEnvFile(envFile, { required: true });
const url = pocketBaseUrl({ ...process.env, ...env });
const targetCollections = ["users", "mutuales", "pacientes", "consultas", "recetas"];

const authentication = await adminToken(url, env, envFile);
const healthResponse = await fetch(`${url}/api/health`, { cache: "no-store" });
const health = await jsonOrText(healthResponse);
if (!healthResponse.ok) throw new Error(`PocketBase health ${healthResponse.status}`);

const collections = [];
for (const name of targetCollections) {
  const response = await fetch(`${url}/api/collections/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${authentication.token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`No se pudo leer ${name}: PocketBase ${response.status}`);
  const collection = await response.json();
  collections.push({
    id: collection.id,
    name: collection.name,
    type: collection.type,
    rules: {
      list: ruleState(collection.listRule),
      view: ruleState(collection.viewRule),
      create: ruleState(collection.createRule),
      update: ruleState(collection.updateRule),
      delete: ruleState(collection.deleteRule),
    },
    fields: collection.fields.map((field) => ({
      name: field.name,
      type: field.type,
      required: field.required === true,
      system: field.system === true,
      relation: field.collectionId || undefined,
    })),
    indexes: collection.indexes || [],
  });
}

const schemaJson = JSON.stringify(collections);
const result = {
  inspectedAt: new Date().toISOString(),
  server: new URL(url).origin,
  health,
  pocketBaseGeneration: authentication.endpoint.includes("_superusers") ? "modern-_superusers" : "legacy-admins",
  reportedVersion: detectReportedVersion(healthResponse.headers, health),
  schemaSha256: createHash("sha256").update(schemaJson).digest("hex"),
  collections,
};

console.log(JSON.stringify(result, null, 2));

async function adminToken(baseUrl, values, sourcePath) {
  if (values.POCKETBASE_ADMIN_TOKEN) {
    return { token: values.POCKETBASE_ADMIN_TOKEN, endpoint: "configured-token" };
  }

  if (!values.POCKETBASE_ADMIN_EMAIL || !values.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Faltan credenciales administrativas en ${sourcePath}`);
  }

  const body = JSON.stringify({
    identity: values.POCKETBASE_ADMIN_EMAIL,
    password: values.POCKETBASE_ADMIN_PASSWORD,
  });

  for (const endpoint of ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    if (response.ok) return { token: (await response.json()).token, endpoint };
  }

  throw new Error(`No se pudo autenticar contra PocketBase usando ${sourcePath}`);
}

function detectReportedVersion(headers, body) {
  const headerNames = ["x-pocketbase-version", "pocketbase-version", "x-version"];
  for (const name of headerNames) {
    const value = headers.get(name);
    if (value) return value;
  }

  if (body && typeof body === "object") {
    for (const key of ["version", "appVersion", "pocketbaseVersion"]) {
      if (typeof body[key] === "string") return body[key];
    }
  }

  return null;
}

function ruleState(value) {
  if (value === null) return "locked";
  if (value === "") return "public";
  return "filtered";
}

async function jsonOrText(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}
