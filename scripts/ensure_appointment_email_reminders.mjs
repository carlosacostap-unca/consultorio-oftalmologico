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

await ensureTurnoReminderFields();
await ensureSystemSettingDefaults();

console.log("Asegurados campos y configuracion de recordatorios de turnos");

async function ensureTurnoReminderFields() {
  const turnos = await collectionByName("turnos");
  const fields = turnos.fields.filter((field) => !field.system).map(cleanField);
  upsertField(fields, dateField("recordatorio_email_enviado_at"));
  upsertField(fields, textField("recordatorio_email_error", 500));

  await pb(`/api/collections/${encodeURIComponent(turnos.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: turnos.name,
      type: turnos.type,
      listRule: turnos.listRule,
      viewRule: turnos.viewRule,
      createRule: turnos.createRule,
      updateRule: turnos.updateRule,
      deleteRule: turnos.deleteRule,
      fields,
      indexes: turnos.indexes || [],
    }),
  });
}

async function ensureSystemSettingDefaults() {
  await ensureSetting("appointment_reminders_enabled", false);
  await ensureSetting("appointment_reminder_hours_before", 24);
  await ensureSetting("email_smtp_host", "smtp.gmail.com");
  await ensureSetting("email_smtp_port", 465);
  await ensureSetting("email_smtp_secure", true);
  await ensureSetting("email_smtp_user", "");
  await ensureSetting("email_smtp_from_name", "Consultorio oftalmologico");
  await ensureSetting("email_smtp_from_address", "");
  await ensureSetting("appointment_reminder_email_subject_template", "Recordatorio de turno");
  await ensureSetting(
    "appointment_reminder_email_body_template",
    [
      "Hola {{paciente}}.",
      "",
      "Te recordamos tu turno en {{consultorio}}:",
      "Fecha: {{fecha}}",
      "Hora: {{hora}}",
      "Medico: {{medico}}",
      "Tipo: {{tipo}}",
      "Motivo: {{motivo}}",
      "",
      "Si no podes asistir, por favor comunicate con el consultorio.",
    ].join("\n")
  );
}

async function ensureSetting(key, value) {
  const existing = await findFirstRecord("system_settings", `key = "${key}"`);
  if (existing) return;

  await pb("/api/collections/system_settings/records", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

function upsertField(fields, field) {
  const index = fields.findIndex((item) => item.name === field.name);
  if (index === -1) {
    fields.push(field);
  } else {
    fields[index] = { ...fields[index], ...field };
  }
}

function cleanField(field) {
  const cleaned = { ...field };
  delete cleaned.created;
  delete cleaned.updated;
  return cleaned;
}

function textField(name, max = 0) {
  return {
    name,
    type: "text",
    required: false,
    hidden: false,
    presentable: false,
    min: 0,
    max,
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

async function findFirstRecord(collection, filter) {
  const params = new URLSearchParams({ page: "1", perPage: "1", filter });
  const result = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
  return result.items?.[0] || null;
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
