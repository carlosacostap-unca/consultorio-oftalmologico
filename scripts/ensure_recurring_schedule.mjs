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

await ensureCollection("agenda_semanal_medico", agendaSemanalPayload(users.id));
await ensureCollection("bloqueos_agenda", bloqueosAgendaPayload(users.id));

console.log("Schema de agenda recurrente listo.");

function agendaSemanalPayload(usersCollectionId) {
  return {
    name: "agenda_semanal_medico",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      relationField("medico_id", usersCollectionId, { required: true }),
      numberField("dia_semana", { required: true, min: 0, max: 6 }),
      textField("hora_inicio", { required: true }),
      textField("hora_fin", { required: true }),
      selectField("tipo", ["Consulta", "Estudio", "Cirugia"], { required: true }),
      numberField("duracion_minutos", { required: true, min: 1, max: 720 }),
      boolField("activo"),
      autodateField("created", { onCreate: true, onUpdate: false }),
      autodateField("updated", { onCreate: true, onUpdate: true }),
    ],
    indexes: [
      "CREATE INDEX idx_agenda_semanal_medico_medico_dia ON agenda_semanal_medico (medico_id, dia_semana)",
    ],
  };
}

function bloqueosAgendaPayload(usersCollectionId) {
  return {
    name: "bloqueos_agenda",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      selectField("alcance", ["general", "medico"], { required: true }),
      relationField("medico_id", usersCollectionId),
      dateField("fecha_inicio", { required: true }),
      dateField("fecha_fin", { required: true }),
      textField("hora_inicio"),
      textField("hora_fin"),
      boolField("dia_completo"),
      textField("motivo"),
      relationField("creado_por", usersCollectionId),
      autodateField("created", { onCreate: true, onUpdate: false }),
      autodateField("updated", { onCreate: true, onUpdate: true }),
    ],
    indexes: [
      "CREATE INDEX idx_bloqueos_agenda_fechas ON bloqueos_agenda (fecha_inicio, fecha_fin)",
      "CREATE INDEX idx_bloqueos_agenda_medico ON bloqueos_agenda (medico_id)",
    ],
  };
}

async function ensureCollection(name, payload) {
  const existing = await maybeCollectionByName(name);

  if (existing) {
    await pb(`/api/collections/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`Actualizada coleccion ${name}`);
    return;
  }

  await pb("/api/collections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(`Creada coleccion ${name}`);
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

function textField(name, options = {}) {
  return {
    name,
    type: "text",
    required: Boolean(options.required),
    hidden: false,
    presentable: false,
    min: 0,
    max: 0,
    pattern: "",
    autogeneratePattern: "",
    primaryKey: false,
  };
}

function numberField(name, options = {}) {
  return {
    name,
    type: "number",
    required: Boolean(options.required),
    hidden: false,
    presentable: false,
    onlyInt: true,
    min: options.min ?? null,
    max: options.max ?? null,
  };
}

function selectField(name, values, options = {}) {
  return {
    name,
    type: "select",
    required: Boolean(options.required),
    hidden: false,
    presentable: false,
    maxSelect: 1,
    values,
  };
}

function boolField(name) {
  return {
    name,
    type: "bool",
    required: false,
    hidden: false,
    presentable: false,
  };
}

function dateField(name, options = {}) {
  return {
    name,
    type: "date",
    required: Boolean(options.required),
    hidden: false,
    presentable: false,
    min: "",
    max: "",
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
