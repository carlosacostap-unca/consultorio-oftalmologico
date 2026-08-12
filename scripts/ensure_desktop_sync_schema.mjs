import {
  assertTestingPocketBaseUrl,
  envFileFromArgs,
  hasFlag,
  loadEnvFile,
  pocketBaseUrl,
} from "./env_utils.mjs";
import {
  assertUniqueDesktopDeviceBackfills,
  buildDesktopDeviceBackfill,
  changedDesktopDeviceFields,
  mergePocketBaseIndexes,
  missingPocketBaseIndexes,
} from "./desktop_sync_device_compat.mjs";

const envFile = envFileFromArgs(".env.local");
const env = loadEnvFile(envFile, { required: true });
const PB_URL = pocketBaseUrl({ ...process.env, ...env });
const dryRun = hasFlag("--dry-run");
const devicesOnly = hasFlag("--devices-only");

assertTestingPocketBaseUrl(PB_URL, {
  requireTest: hasFlag("--require-test-pocketbase") || process.env.REQUIRE_TEST_POCKETBASE === "true",
});

const token = await adminToken(PB_URL, env, envFile);
const collections = await listCollections();
const byName = new Map(collections.map((collection) => [collection.name, collection]));
const users = requiredCollection("users");

if (!devicesOnly) {
  for (const name of ["pacientes", "consultas", "recetas"]) {
    await ensureDomainSyncFields(requiredCollection(name), users.id, { patient: name === "pacientes" });
  }
}

const syncDeviceFields = [
  textField("device_key", { required: true }),
  textField("nombre"),
  selectField("modo", ["desktop", "sync-worker"], { required: true }),
  boolField("habilitado"),
  relationField("usuario_id", users.id),
  dateField("ultimo_contacto_at"),
  jsonField("metadata"),
  textField("device_id", { required: true }),
  textField("code", { required: true }),
  textField("name"),
  boolField("enabled"),
  relationField("activated_by", users.id),
  dateField("activated_at"),
  dateField("last_seen_at"),
  dateField("last_sync_at"),
  textField("app_version"),
  selectField("update_channel", ["pilot", "stable"]),
  boolField("updates_enabled"),
  textField("installed_version"),
  selectField("last_update_status", ["idle", "checking", "available", "downloading", "downloaded", "postponed", "installed", "error", "blocked"]),
  dateField("last_update_at"),
  textField("last_update_version"),
  textField("last_update_code"),
];
const syncDeviceIndexes = [
  "CREATE UNIQUE INDEX `idx_sync_devices_device_key` ON `sync_devices` (`device_key`)",
  "CREATE UNIQUE INDEX `idx_sync_devices_device_id` ON `sync_devices` (`device_id`)",
  "CREATE UNIQUE INDEX `idx_sync_devices_code` ON `sync_devices` (`code`)",
];
const existingSyncDevices = byName.get("sync_devices");

if (!existingSyncDevices) {
  await ensureBaseCollection({ name: "sync_devices", fields: syncDeviceFields, indexes: syncDeviceIndexes });
} else {
  const transitionalFields = syncDeviceFields.map((field) =>
    field.name === "device_id" || field.name === "code" ? { ...field, required: false } : field
  );
  await updateCollectionFields(existingSyncDevices, transitionalFields);
  await backfillSyncDevices();
  if (dryRun) {
    const missingIndexes = missingPocketBaseIndexes(existingSyncDevices.indexes || [], syncDeviceIndexes);
    if (missingIndexes.length > 0) console.log("Actualizaría sync_devices: campos obligatorios e índices posteriores al backfill");
  } else {
    const refreshed = await pb(`/api/collections/${encodeURIComponent(existingSyncDevices.id)}`);
    await updateCollectionFields(refreshed, syncDeviceFields, syncDeviceIndexes);
  }
}

if (!devicesOnly) await ensureBaseCollection({
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

if (!devicesOnly) await ensureBaseCollection({
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

  const indexes = mergePocketBaseIndexes(collection.indexes || [], requiredIndexes);
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

function selectField(name, values, { required = false } = {}) {
  return { name, type: "select", required, hidden: false, presentable: false, maxSelect: 1, values };
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

async function backfillSyncDevices() {
  const records = await listAllRecords("sync_devices");
  const backfills = records.map((record) => ({
    id: record.id,
    record,
    payload: buildDesktopDeviceBackfill(record),
  }));
  assertUniqueDesktopDeviceBackfills(backfills);

  let changed = 0;
  for (const item of backfills) {
    const fields = changedDesktopDeviceFields(item.record, item.payload);
    if (fields.length === 0) continue;
    changed += 1;
    console.log(`${dryRun ? "Completaría" : "Completando"} sync_devices/${item.id}: ${fields.join(", ")}`);
    if (!dryRun) {
      await pb(`/api/collections/sync_devices/records/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify(item.payload),
      });
    }
  }
  console.log(`Backfill técnico sync_devices: ${changed}/${records.length} registro(s) ${dryRun ? "requerirían" : "requirieron"} actualización.`);
}

async function listAllRecords(collection) {
  const records = [];
  for (let page = 1; ; page += 1) {
    const result = await pb(`/api/collections/${encodeURIComponent(collection)}/records?page=${page}&perPage=200&sort=id`);
    records.push(...(result.items || []));
    if (page >= (result.totalPages || 1)) return records;
  }
}
