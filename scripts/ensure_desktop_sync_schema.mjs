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
const dryRun = hasFlag("--dry-run");

assertTestingPocketBaseUrl(PB_URL, {
  requireTest: hasFlag("--require-test-pocketbase") || process.env.REQUIRE_TEST_POCKETBASE === "true",
});

const token = await adminToken(PB_URL, env, envFile);
const collections = await listCollections();
const byName = new Map(collections.map((collection) => [collection.name, collection]));
const users = requiredCollection("users");

for (const name of ["pacientes", "consultas", "recetas"]) {
  await ensureDomainSyncFields(requiredCollection(name), users.id, { patient: name === "pacientes" });
}

await ensureBaseCollection({
  name: "sync_devices",
  fields: [
    textField("device_id", { required: true }),
    textField("code", { required: true }),
    textField("name"),
    boolField("enabled"),
    relationField("activated_by", users.id),
    dateField("activated_at"),
    dateField("last_seen_at"),
    dateField("last_sync_at"),
    textField("app_version"),
  ],
  indexes: [
    "CREATE UNIQUE INDEX `idx_sync_devices_device_id` ON `sync_devices` (`device_id`)",
    "CREATE UNIQUE INDEX `idx_sync_devices_code` ON `sync_devices` (`code`)",
  ],
});

await ensureBaseCollection({
  name: "sync_applied_operations",
  fields: [
    textField("operation_id", { required: true }),
    textField("device_id", { required: true }),
    selectField("entity", ["pacientes", "consultas", "recetas"]),
    textField("record_id", { required: true }),
    selectField("status", ["confirmed", "conflict", "rejected"]),
    jsonField("result_json"),
    relationField("actor_id", users.id),
    dateField("applied_at"),
  ],
  indexes: [
    "CREATE UNIQUE INDEX `idx_sync_applied_operation_id` ON `sync_applied_operations` (`operation_id`)",
    "CREATE INDEX `idx_sync_applied_device` ON `sync_applied_operations` (`device_id`, `applied_at`)",
  ],
});

await ensureBaseCollection({
  name: "sync_conflicts",
  fields: [
    textField("operation_id", { required: true }),
    selectField("entity", ["pacientes", "consultas", "recetas"]),
    textField("record_id", { required: true }),
    selectField("kind", ["concurrent_update", "possible_duplicate", "delete_conflict", "validation"]),
    jsonField("base_snapshot"),
    jsonField("local_snapshot"),
    jsonField("central_snapshot"),
    jsonField("conflicting_fields"),
    relationField("actor_id", users.id),
    textField("device_id", { required: true }),
    selectField("status", ["open", "resolved", "discarded"]),
    dateField("detected_at"),
    dateField("resolved_at"),
    relationField("resolved_by", users.id),
    selectField("resolution", ["keep_central", "apply_local", "link_patient"]),
    textField("resolution_note"),
  ],
  indexes: [
    "CREATE INDEX `idx_sync_conflicts_status` ON `sync_conflicts` (`status`, `detected_at`)",
    "CREATE INDEX `idx_sync_conflicts_record` ON `sync_conflicts` (`entity`, `record_id`)",
  ],
});

console.log(`${dryRun ? "Dry-run" : "Schema"} de sincronización de escritorio listo. No se modificaron registros clínicos.`);

async function ensureDomainSyncFields(collection, usersId, { patient }) {
  const requiredFields = [
    boolField("sync_deleted"),
    dateField("sync_deleted_at"),
    relationField("sync_deleted_by", usersId),
    textField("sync_device_id"),
    textField("sync_operation_id"),
    textField("sync_base_updated"),
  ];

  if (patient) {
    requiredFields.push(textField("sync_ficha_provisoria"), textField("sync_ficha_definitiva"));
  }

  await updateCollectionFields(collection, requiredFields);
}

async function ensureBaseCollection(definition) {
  const existing = byName.get(definition.name);
  if (!existing) {
    console.log(`${dryRun ? "Crearía" : "Creando"} colección ${definition.name}`);
    if (dryRun) return;

    const created = await pb("/api/collections", {
      method: "POST",
      body: JSON.stringify({
        name: definition.name,
        type: "base",
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: definition.fields,
        indexes: definition.indexes,
      }),
    });
    byName.set(created.name, created);
    return;
  }

  await updateCollectionFields(existing, definition.fields, definition.indexes);
}

async function updateCollectionFields(collection, requiredFields, requiredIndexes = []) {
  const fields = collection.fields.filter((field) => !field.system).map(cleanField);
  const byFieldName = new Map(fields.map((field, index) => [field.name, index]));
  const changes = [];

  for (const required of requiredFields) {
    const index = byFieldName.get(required.name);
    if (index === undefined) {
      fields.push(required);
      changes.push(`+${required.name}`);
    } else {
      fields[index] = { ...fields[index], ...required, id: fields[index].id };
    }
  }

  const indexes = [...new Set([...(collection.indexes || []), ...requiredIndexes])];
  const indexesChanged = indexes.length !== (collection.indexes || []).length;

  if (changes.length === 0 && !indexesChanged) {
    console.log(`Sin cambios en ${collection.name}`);
    return;
  }

  console.log(`${dryRun ? "Actualizaría" : "Actualizando"} ${collection.name}: ${changes.join(", ") || "índices"}`);
  if (dryRun) return;

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
      indexes,
    }),
  });
}

function requiredCollection(name) {
  const collection = byName.get(name);
  if (!collection) throw new Error(`No existe la colección requerida ${name}`);
  return collection;
}

async function listCollections() {
  const response = await pb("/api/collections?perPage=500");
  return response.items;
}

function textField(name, { required = false } = {}) {
  return { name, type: "text", required, hidden: false, presentable: false, primaryKey: false, min: 0, max: 0, pattern: "", autogeneratePattern: "" };
}

function boolField(name) {
  return { name, type: "bool", required: false, hidden: false, presentable: false };
}

function dateField(name) {
  return { name, type: "date", required: false, hidden: false, presentable: false, min: "", max: "" };
}

function jsonField(name) {
  return { name, type: "json", required: false, hidden: false, presentable: false, maxSize: 0 };
}

function selectField(name, values) {
  return { name, type: "select", required: false, hidden: false, presentable: false, maxSelect: 1, values };
}

function relationField(name, collectionId) {
  return { name, type: "relation", required: false, hidden: false, presentable: false, collectionId, cascadeDelete: false, minSelect: 0, maxSelect: 1 };
}

function cleanField(field) {
  const cleaned = { ...field };
  delete cleaned.created;
  delete cleaned.updated;
  return cleaned;
}

async function adminToken(url, values, sourcePath) {
  if (values.POCKETBASE_ADMIN_TOKEN) return values.POCKETBASE_ADMIN_TOKEN;
  if (!values.POCKETBASE_ADMIN_EMAIL || !values.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura credenciales administrativas en ${sourcePath}`);
  }

  const body = JSON.stringify({ identity: values.POCKETBASE_ADMIN_EMAIL, password: values.POCKETBASE_ADMIN_PASSWORD });
  for (const path of ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]) {
    const response = await fetch(`${url}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (response.ok) return (await response.json()).token;
  }
  throw new Error(`No se pudo autenticar contra PocketBase usando ${sourcePath}`);
}

async function pb(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${PB_URL}${path}`, { ...options, headers });
  if (!response.ok) throw new Error(`PocketBase ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
