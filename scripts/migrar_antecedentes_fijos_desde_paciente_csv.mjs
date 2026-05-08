import fs from "node:fs";

const env = loadEnv(".env.local");
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const CSV_PATH = process.argv[2] || "C:/Users/carlo/Downloads/PACIENTE.DBF.csv";
const PER_PAGE = 500;
const CONCURRENCY = 30;

const token = await adminToken();

const UI_ANTECEDENTES = [
  "ant_diabetes",
  "ant_glaucoma",
  "ant_maculopatia",
  "ant_asmatico",
  "ant_hipertension",
  "ant_alergico",
  "ant_reuma",
  "ant_gota",
  "ant_herpes",
  "ant_otra",
];

const csvRows = readPacienteCsv(CSV_PATH);
const pacientes = await listAll("pacientes", {
  fields: "id,numero_ficha,numero_documento,ant_diabetes,ant_glaucoma,ant_maculopatia,ant_asmatico,ant_hipertension,ant_alergico,ant_reuma,ant_gota,ant_herpes,ant_otra",
});

const pacientesByFicha = groupBy(pacientes, (paciente) => normalizeKey(paciente.numero_ficha));
const pacientesByDocumento = groupBy(pacientes, (paciente) => normalizeKey(paciente.numero_documento));
const antecedentesByPacienteId = new Map();
const matchStats = {
  csvRows: csvRows.length,
  matchedByFicha: 0,
  matchedByDocumento: 0,
  skippedAmbiguousFicha: 0,
  skippedAmbiguousDocumento: 0,
  skippedNoMatch: 0,
};

for (const row of csvRows) {
  const ficha = normalizeKey(row.NUM_FICH);
  const documento = normalizeKey(row.DOCUM);
  const fichaMatches = ficha ? pacientesByFicha.get(ficha) || [] : [];

  if (fichaMatches.length === 1) {
    antecedentesByPacienteId.set(fichaMatches[0].id, row.antecedentes);
    matchStats.matchedByFicha += 1;
    continue;
  }

  if (fichaMatches.length > 1) {
    matchStats.skippedAmbiguousFicha += 1;
  }

  const documentoMatches = documento ? pacientesByDocumento.get(documento) || [] : [];
  if (documentoMatches.length === 1) {
    antecedentesByPacienteId.set(documentoMatches[0].id, row.antecedentes);
    matchStats.matchedByDocumento += 1;
    continue;
  }

  if (documentoMatches.length > 1) {
    matchStats.skippedAmbiguousDocumento += 1;
  } else {
    matchStats.skippedNoMatch += 1;
  }
}

console.log("--- Cruce CSV -> pacientes ---");
console.log(JSON.stringify(matchStats, null, 2));
console.log(`Pacientes con antecedentes mapeados: ${antecedentesByPacienteId.size}`);

let patientUpdates = 0;
let patientSkipped = 0;
let patientFailed = 0;

const patientTasks = [];
for (const paciente of pacientes) {
  const antecedentes = antecedentesByPacienteId.get(paciente.id);
  if (!antecedentes) continue;

  if (!hasChanged(paciente, antecedentes)) {
    patientSkipped += 1;
    continue;
  }

  patientTasks.push(() =>
    pb(`/api/collections/pacientes/records/${encodeURIComponent(paciente.id)}`, {
      method: "PATCH",
      body: JSON.stringify(antecedentes),
    }),
  );
}

const patientResults = await runWithConcurrency(patientTasks, CONCURRENCY);
patientUpdates = patientResults.success;
patientFailed = patientResults.failed;

console.log("--- Pacientes ---");
console.log(`Actualizados: ${patientUpdates}`);
console.log(`Sin cambios: ${patientSkipped}`);
console.log(`Errores: ${patientFailed}`);

let consultasInspected = 0;
let consultasUpdated = 0;
let consultasSkippedNoPatient = 0;
let consultasSkippedNoChange = 0;
let consultasFailed = 0;
let page = 1;
let totalPages = 1;

do {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(PER_PAGE),
    sort: "created",
    fields: ["id", "paciente_id", ...UI_ANTECEDENTES].join(","),
  });
  const result = await pb(`/api/collections/consultas/records?${params}`);
  totalPages = result.totalPages;
  consultasInspected += result.items.length;

  const tasks = [];
  for (const consulta of result.items) {
    const antecedentes = antecedentesByPacienteId.get(consulta.paciente_id);
    if (!antecedentes) {
      consultasSkippedNoPatient += 1;
      continue;
    }

    if (!hasChanged(consulta, antecedentes)) {
      consultasSkippedNoChange += 1;
      continue;
    }

    tasks.push(() =>
      pb(`/api/collections/consultas/records/${encodeURIComponent(consulta.id)}`, {
        method: "PATCH",
        body: JSON.stringify(antecedentes),
      }),
    );
  }

  const results = await runWithConcurrency(tasks, CONCURRENCY);
  consultasUpdated += results.success;
  consultasFailed += results.failed;

  console.log(
    `Pagina ${page}/${totalPages}: consultas=${consultasInspected}, actualizadas=${consultasUpdated}, sinPaciente=${consultasSkippedNoPatient}, sinCambios=${consultasSkippedNoChange}, errores=${consultasFailed}`,
  );

  page += 1;
} while (page <= totalPages);

console.log("--- Consultas ---");
console.log(`Revisadas: ${consultasInspected}`);
console.log(`Actualizadas: ${consultasUpdated}`);
console.log(`Sin paciente mapeado: ${consultasSkippedNoPatient}`);
console.log(`Sin cambios: ${consultasSkippedNoChange}`);
console.log(`Errores: ${consultasFailed}`);

if (patientFailed > 0 || consultasFailed > 0) {
  process.exitCode = 1;
}

function readPacienteCsv(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`No se encontro el CSV: ${path}`);
  }

  const content = fs.readFileSync(path, "latin1");
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  const headers = splitCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    if (!row.APELLIDOS && !row.NOMBRES) continue;

    rows.push({
      ...row,
      antecedentes: {
        ant_diabetes: toBool(row.DIABETE),
        ant_glaucoma: false,
        ant_maculopatia: false,
        ant_asmatico: toBool(row.ASMA),
        ant_hipertension: false,
        ant_alergico: toBool(row.ALERGIA),
        ant_reuma: toBool(row.REUMA),
        ant_gota: toBool(row.GOTA),
        ant_herpes: toBool(row.HERPES),
        ant_otra: String(row.OTROANTEC || "").trim(),
      },
    });
  }

  return rows;
}

function splitCsvLine(line) {
  return line.split(";");
}

function toBool(value) {
  return String(value || "").trim() === "1";
}

function normalizeKey(value) {
  return String(value || "").trim().toUpperCase();
}

function groupBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function hasChanged(record, antecedentes) {
  return UI_ANTECEDENTES.some((field) => {
    if (field === "ant_otra") {
      return String(record[field] || "") !== antecedentes[field];
    }

    return Boolean(record[field]) !== antecedentes[field];
  });
}

async function listAll(collection, options = {}) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE),
    });

    if (options.fields) params.set("fields", options.fields);

    const data = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
    items.push(...data.items);
    totalPages = data.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

async function runWithConcurrency(tasks, concurrency) {
  let index = 0;
  let success = 0;
  let failed = 0;

  async function worker() {
    while (index < tasks.length) {
      const task = tasks[index];
      index += 1;

      try {
        await task();
        success += 1;
      } catch (error) {
        failed += 1;
        console.error(`Error de actualizacion: ${error.message}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);

  return { success, failed };
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

async function adminToken() {
  if (env.POCKETBASE_ADMIN_TOKEN) {
    return env.POCKETBASE_ADMIN_TOKEN;
  }

  const identity = env.POCKETBASE_ADMIN_EMAIL;
  const password = env.POCKETBASE_ADMIN_PASSWORD;

  if (!identity || !password) {
    throw new Error("Credenciales admin de PocketBase no configuradas");
  }

  const body = JSON.stringify({ identity, password });
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

  if (!response.ok) {
    throw new Error(`No se pudo autenticar en PocketBase: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.token;
}

function loadEnv(path) {
  if (!fs.existsSync(path)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function requiredEnv(key, fallback = "") {
  const value = env[key] || fallback;
  if (!value) {
    throw new Error(`Falta configurar ${key}`);
  }

  return value;
}
