import {
  assertTestingPocketBaseUrl,
  envFileFromArgs,
  hasFlag,
  loadEnvFile,
  pocketBaseUrl,
} from "./env_utils.mjs";

const sourceEnvFile = argValue("--source-env") || ".env.local";
const targetEnvFile = argValue("--target-env") || envFileFromArgs(".env.test.local");
const includeUsers = hasFlag("--include-users");

const sourceEnv = loadEnvFile(sourceEnvFile, { required: true });
const targetEnv = loadEnvFile(targetEnvFile, { required: true });
const sourceUrl = pocketBaseUrl(sourceEnv);
const targetUrl = pocketBaseUrl(targetEnv);

assertTestingPocketBaseUrl(targetUrl, {
  requireTest: hasFlag("--require-test-pocketbase") || process.env.REQUIRE_TEST_POCKETBASE === "true",
});

const source = {
  name: "fuente",
  url: sourceUrl,
  token: await adminToken(sourceUrl, sourceEnv, sourceEnvFile),
};
const target = {
  name: "testing",
  url: targetUrl,
  token: await adminToken(targetUrl, targetEnv, targetEnvFile),
};

const sourceCollections = (await pb(source, "/api/collections?perPage=200")).items;
const targetCollections = (await pb(target, "/api/collections?perPage=200")).items;
const targetByName = new Map(targetCollections.map((collection) => [collection.name, collection]));

const candidates = sourceCollections.filter((collection) => shouldCopyCollection(collection, { includeUsers }));
const orderedCollections = orderByRelations(candidates);

console.log(`Colecciones fuente candidatas: ${orderedCollections.length}`);

for (const collection of orderedCollections) {
  const payload = collectionPayload(collection);
  const existing = targetByName.get(collection.name);

  if (existing) {
    await pb(target, `/api/collections/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`Actualizada coleccion ${collection.name}`);
    continue;
  }

  await pb(target, "/api/collections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(`Creada coleccion ${collection.name}`);
}

console.log("Bootstrap de esquema PocketBase test completado.");

function shouldCopyCollection(collection, { includeUsers }) {
  if (collection.system) return false;
  if (collection.name.startsWith("_")) return false;
  if (!includeUsers && collection.name === "users") return false;

  return true;
}

function collectionPayload(collection) {
  const payload = {
    id: collection.id,
    name: collection.name,
    type: collection.type,
    listRule: collection.listRule,
    viewRule: collection.viewRule,
    createRule: collection.createRule,
    updateRule: collection.updateRule,
    deleteRule: collection.deleteRule,
    fields: collection.fields.filter((field) => !field.system).map(cleanField),
    indexes: collection.indexes || [],
  };

  return payload;
}

function cleanField(field) {
  const cleaned = { ...field };
  delete cleaned.created;
  delete cleaned.updated;

  return cleaned;
}

function orderByRelations(collections) {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const pending = new Map(collections.map((collection) => [collection.id, collection]));
  const ordered = [];

  while (pending.size > 0) {
    let progressed = false;

    for (const [id, collection] of pending) {
      const deps = relationDependencies(collection).filter((depId) => byId.has(depId));
      const ready = deps.every((depId) => !pending.has(depId));

      if (ready) {
        ordered.push(collection);
        pending.delete(id);
        progressed = true;
      }
    }

    if (!progressed) {
      ordered.push(...pending.values());
      break;
    }
  }

  return ordered;
}

function relationDependencies(collection) {
  return collection.fields
    .filter((field) => field.type === "relation" && field.collectionId)
    .map((field) => field.collectionId);
}

async function adminToken(url, env, envFile) {
  if (env.POCKETBASE_ADMIN_TOKEN) return env.POCKETBASE_ADMIN_TOKEN;

  if (!env.POCKETBASE_ADMIN_EMAIL || !env.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura POCKETBASE_ADMIN_TOKEN o POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD en ${envFile}`);
  }

  const body = JSON.stringify({
    identity: env.POCKETBASE_ADMIN_EMAIL,
    password: env.POCKETBASE_ADMIN_PASSWORD,
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

  throw new Error(`No se pudo autenticar contra PocketBase usando ${envFile}`);
}

async function pb(instance, path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${instance.token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${instance.url}${path}`, { ...options, headers });

  if (!response.ok) {
    throw new Error(`${instance.name} PocketBase ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function argValue(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}
