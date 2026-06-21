import fs from "node:fs";

const ENV_PATH = argValue("--env") || ".env.local";
const LOCAL_DATE = argValue("--date") || "2026-06-16";
const env = loadEnv(ENV_PATH);
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const token = await adminToken();

const { startUtc, endUtc } = buenosAiresDayUtcRange(LOCAL_DATE);
const createdToday = await getPage("consultas", {
  filter: `created >= "${startUtc}" && created < "${endUtc}"`,
  fields: "id,paciente_id,numero_ficha,fecha,motivo_consulta,created",
  sort: "-created",
  perPage: 25,
});
const clinicalToday = await getPage("consultas", {
  filter: `fecha >= "${startUtc}" && fecha < "${endUtc}"`,
  fields: "id,paciente_id,numero_ficha,fecha,motivo_consulta,created",
  sort: "-created",
  perPage: 25,
});

const patientIds = [...new Set([...createdToday.items, ...clinicalToday.items].map((item) => item.paciente_id).filter(Boolean))];
const patients = [];
for (const chunk of chunks(patientIds, 50)) {
  const filter = chunk.map((id) => `id = "${escapeFilterValue(id)}"`).join(" || ");
  patients.push(...await listAll("pacientes", {
    filter,
    fields: "id,nombre,apellido,numero_documento,dni,numero_ficha",
  }));
}

const patientById = new Map(patients.map((patient) => [patient.id, patient]));

console.log(JSON.stringify({
  timezone: "America/Buenos_Aires",
  localDate: LOCAL_DATE,
  utcRange: { startUtc, endUtc },
  createdTodayCount: createdToday.totalItems,
  clinicalDateTodayCount: clinicalToday.totalItems,
  createdTodaySample: summarize(createdToday.items),
  clinicalDateTodaySample: summarize(clinicalToday.items),
}, null, 2));

function summarize(items) {
  return items.slice(0, 25).map((consulta) => {
    const patient = patientById.get(consulta.paciente_id) || {};
    return {
      id: consulta.id,
      ficha: consulta.numero_ficha || patient.numero_ficha || "",
      paciente: [patient.apellido, patient.nombre].filter(Boolean).join(", "),
      fecha: consulta.fecha || "",
      created: consulta.created || "",
      motivo: consulta.motivo_consulta || "",
    };
  });
}

async function listAll(collection, options = {}) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: "500",
    });
    if (options.filter) params.set("filter", options.filter);
    if (options.fields) params.set("fields", options.fields);
    if (options.sort) params.set("sort", options.sort);

    const response = await fetch(`${PB_URL}/api/collections/${encodeURIComponent(collection)}/records?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`PocketBase ${collection} ${response.status}: ${text}`);
    const data = text ? JSON.parse(text) : {};
    items.push(...(data.items || []));
    totalPages = data.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function getPage(collection, options = {}) {
  const params = new URLSearchParams({
    page: "1",
    perPage: String(options.perPage || 25),
  });
  if (options.filter) params.set("filter", options.filter);
  if (options.fields) params.set("fields", options.fields);
  if (options.sort) params.set("sort", options.sort);

  const response = await fetch(`${PB_URL}/api/collections/${encodeURIComponent(collection)}/records?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`PocketBase ${collection} ${response.status}: ${text}`);
  const data = text ? JSON.parse(text) : {};
  return {
    totalItems: data.totalItems || 0,
    items: data.items || [],
  };
}

async function adminToken() {
  if (env.POCKETBASE_ADMIN_TOKEN) return env.POCKETBASE_ADMIN_TOKEN;
  if (!env.POCKETBASE_ADMIN_EMAIL || !env.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura credenciales admin en ${ENV_PATH}`);
  }

  const body = JSON.stringify({
    identity: env.POCKETBASE_ADMIN_EMAIL,
    password: env.POCKETBASE_ADMIN_PASSWORD,
  });
  let response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    response = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  }

  if (!response.ok) throw new Error(`No se pudo autenticar contra PocketBase: ${response.status} ${await response.text()}`);
  return (await response.json()).token;
}

function buenosAiresDayUtcRange(localDate) {
  const [year, month, day] = localDate.split("-").map(Number);
  if (!year || !month || !day) throw new Error(`Fecha invalida: ${localDate}`);
  const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 3, 0, 0, 0));
  return {
    startUtc: start.toISOString().replace("T", " "),
    endUtc: end.toISOString().replace("T", " "),
  };
}

function escapeFilterValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function requiredEnv(name, fallback = "") {
  const value = env[name] || process.env[name] || fallback;
  if (!value) throw new Error(`${name} es requerido`);
  return value;
}
