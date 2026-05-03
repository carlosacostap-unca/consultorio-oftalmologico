import fs from "node:fs";

const env = loadEnv(".env.local");
const PB_URL = requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL).replace(/\/$/, "");
const PER_PAGE = 200;

const token = await adminToken();
const mutuales = await listAll("mutuales", { sort: "nombre" });
const pacientes = await listAll("pacientes", { sort: "obra_social" });

const mutualesByNormalizedName = new Map();
for (const mutual of mutuales) {
  const normalized = normalizeName(mutual.nombre);
  if (!normalized) continue;

  const existing = mutualesByNormalizedName.get(normalized) || [];
  existing.push(mutual);
  mutualesByNormalizedName.set(normalized, existing);
}

const stats = {
  totalPacientes: pacientes.length,
  totalMutuales: mutuales.length,
  pacientesConObraSocial: 0,
  pacientesSinObraSocial: 0,
  coincidenciasExactas: 0,
  coincidenciasAproximadas: 0,
  sinCoincidencia: 0,
  ambiguas: 0,
};

const obrasSociales = new Map();

for (const paciente of pacientes) {
  const raw = String(paciente.obra_social || "").trim();
  const normalized = normalizeName(raw);

  if (!normalized) {
    stats.pacientesSinObraSocial += 1;
    continue;
  }

  stats.pacientesConObraSocial += 1;

  if (!obrasSociales.has(normalized)) {
    obrasSociales.set(normalized, {
      nombre: raw,
      normalizado: normalized,
      cantidadPacientes: 0,
      match: null,
      candidatos: [],
    });
  }

  obrasSociales.get(normalized).cantidadPacientes += 1;
}

for (const item of obrasSociales.values()) {
  const exactMatches = mutualesByNormalizedName.get(item.normalizado) || [];

  if (exactMatches.length === 1) {
    item.match = {
      tipo: "exacta",
      mutualId: exactMatches[0].id,
      mutualNombre: exactMatches[0].nombre,
    };
    stats.coincidenciasExactas += item.cantidadPacientes;
    continue;
  }

  if (exactMatches.length > 1) {
    item.match = { tipo: "ambigua_exacta" };
    item.candidatos = exactMatches.map(toCandidate);
    stats.ambiguas += item.cantidadPacientes;
    continue;
  }

  const fuzzyMatches = mutuales
    .filter((mutual) => {
      const mutualName = normalizeName(mutual.nombre);
      return (
        mutualName.length >= 4 &&
        item.normalizado.length >= 4 &&
        (item.normalizado.includes(mutualName) || mutualName.includes(item.normalizado))
      );
    })
    .map(toCandidate);

  if (fuzzyMatches.length === 1) {
    item.match = {
      tipo: "aproximada",
      mutualId: fuzzyMatches[0].id,
      mutualNombre: fuzzyMatches[0].nombre,
    };
    item.candidatos = fuzzyMatches;
    stats.coincidenciasAproximadas += item.cantidadPacientes;
  } else if (fuzzyMatches.length > 1) {
    item.match = { tipo: "ambigua_aproximada" };
    item.candidatos = fuzzyMatches;
    stats.ambiguas += item.cantidadPacientes;
  } else {
    item.match = { tipo: "sin_coincidencia" };
    stats.sinCoincidencia += item.cantidadPacientes;
  }
}

const values = [...obrasSociales.values()].sort((a, b) => b.cantidadPacientes - a.cantidadPacientes);
const sinCoincidencia = values.filter((item) => item.match?.tipo === "sin_coincidencia");
const ambiguas = values.filter((item) => item.match?.tipo?.startsWith("ambigua"));
const aproximadas = values.filter((item) => item.match?.tipo === "aproximada");

console.log("\n--- Diagnostico pacientes -> mutuales ---");
console.log(`Pacientes totales: ${stats.totalPacientes}`);
console.log(`Pacientes con obra_social: ${stats.pacientesConObraSocial}`);
console.log(`Pacientes sin obra_social: ${stats.pacientesSinObraSocial}`);
console.log(`Mutuales: ${stats.totalMutuales}`);
console.log(`Valores distintos de obra_social: ${values.length}`);
console.log(`Pacientes con coincidencia exacta: ${stats.coincidenciasExactas}`);
console.log(`Pacientes con coincidencia aproximada: ${stats.coincidenciasAproximadas}`);
console.log(`Pacientes con coincidencia ambigua: ${stats.ambiguas}`);
console.log(`Pacientes sin coincidencia: ${stats.sinCoincidencia}`);

printSection("Top 20 obras sociales por cantidad", values.slice(0, 20));
printSection("Top 20 coincidencias aproximadas para revisar", aproximadas.slice(0, 20));
printSection("Top 20 ambiguas para resolver manualmente", ambiguas.slice(0, 20));
printSection("Top 20 sin coincidencia", sinCoincidencia.slice(0, 20));

function printSection(title, items) {
  console.log(`\n${title}`);
  if (!items.length) {
    console.log("  Sin casos.");
    return;
  }

  for (const item of items) {
    const match = item.match?.mutualNombre ? ` -> ${item.match.mutualNombre} (${item.match.tipo})` : ` -> ${item.match?.tipo || "sin evaluar"}`;
    console.log(`  ${item.cantidadPacientes.toString().padStart(6)} | ${item.nombre}${match}`);
    if (item.candidatos?.length) {
      const candidatos = item.candidatos.map((candidate) => candidate.nombre).join(", ");
      console.log(`         candidatos: ${candidatos}`);
    }
  }
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

    if (options.sort) params.set("sort", options.sort);

    const data = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
    items.push(...data.items);
    totalPages = data.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
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

  if (!env.POCKETBASE_ADMIN_EMAIL || !env.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error("Configura POCKETBASE_ADMIN_TOKEN o POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD en .env.local");
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

  if (!response.ok) {
    throw new Error(`No se pudo autenticar contra PocketBase: ${response.status} ${await response.text()}`);
  }

  return (await response.json()).token;
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toCandidate(mutual) {
  return {
    id: mutual.id,
    nombre: mutual.nombre,
    codigo: mutual.codigo,
  };
}

function loadEnv(path) {
  if (!fs.existsSync(path)) return {};

  const result = {};
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
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
