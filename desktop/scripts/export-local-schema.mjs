import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  envFileFromArgs,
  loadEnvFile,
  pocketBaseUrl,
} from "../../scripts/env_utils.mjs";

const envFile = envFileFromArgs(".env.test.local");
const env = loadEnvFile(envFile, { required: true });
const url = pocketBaseUrl(env);
const token = await adminToken(url, env, envFile);
const response = await request("/api/collections?perPage=500");
const collections = response.items
  .filter((collection) => !collection.system && !collection.name.startsWith("_"))
  .map(cleanCollection);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(scriptDir, "..", "pocketbase", "pb_migrations");
await mkdir(migrationsDir, { recursive: true });

const migration = `// Generado por desktop/scripts/export-local-schema.mjs desde ${path.basename(envFile)}.\n// Contiene solo esquema; no incluye registros ni credenciales.\n\nmigrate((app) => {\n  const snapshot = ${JSON.stringify(collections, null, 2)};\n  app.importCollections(snapshot, false);\n}, (app) => {\n  // La base local es durable: no se elimina el esquema automaticamente.\n});\n`;

const output = path.join(migrationsDir, "1700000000_import_central_schema.js");
await writeFile(output, migration);
console.log(`Esquema local exportado: ${collections.length} colecciones en ${output}`);

function cleanCollection(collection) {
  const cleaned = {
    id: collection.id,
    name: collection.name,
    type: collection.type,
    system: false,
    listRule: collection.listRule,
    viewRule: collection.viewRule,
    createRule: collection.createRule,
    updateRule: collection.updateRule,
    deleteRule: collection.deleteRule,
    fields: collection.fields.map(cleanField),
    indexes: collection.indexes || [],
  };

  if (collection.type === "auth") {
    Object.assign(cleaned, {
      authRule: collection.authRule,
      manageRule: collection.manageRule,
      authAlert: collection.authAlert,
      oauth2: collection.oauth2,
      passwordAuth: collection.passwordAuth,
      mfa: collection.mfa,
      otp: collection.otp,
    });
  }
  return cleaned;
}

function cleanField(field) {
  const cleaned = { ...field };
  delete cleaned.created;
  delete cleaned.updated;
  return cleaned;
}

async function adminToken(baseUrl, values, sourcePath) {
  if (values.POCKETBASE_ADMIN_TOKEN) return values.POCKETBASE_ADMIN_TOKEN;
  if (!values.POCKETBASE_ADMIN_EMAIL || !values.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura credenciales administrativas en ${sourcePath}`);
  }
  const body = JSON.stringify({ identity: values.POCKETBASE_ADMIN_EMAIL, password: values.POCKETBASE_ADMIN_PASSWORD });
  for (const authPath of ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]) {
    const auth = await fetch(`${baseUrl}${authPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (auth.ok) return (await auth.json()).token;
  }
  throw new Error(`No se pudo autenticar contra PocketBase usando ${sourcePath}`);
}

async function request(requestPath) {
  const result = await fetch(`${url}${requestPath}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!result.ok) throw new Error(`PocketBase ${result.status}: ${await result.text()}`);
  return result.json();
}
