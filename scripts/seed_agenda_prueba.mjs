import fs from "node:fs";
import { assertTestingPocketBaseUrl, envFileFromArgs, hasFlag, pocketBaseUrl } from "./env_utils.mjs";

const envFile = envFileFromArgs(".env.local");
const env = loadEnv(envFile);
const PB_URL = pocketBaseUrl({ ...process.env, ...env }) || requiredEnv("POCKETBASE_URL", env.NEXT_PUBLIC_POCKETBASE_URL);
assertTestingPocketBaseUrl(PB_URL, { requireTest: hasFlag("--require-test-pocketbase") || process.env.REQUIRE_TEST_POCKETBASE === "true" });
console.log("Autenticando contra PocketBase...");
const token = await adminToken();
if (hasFlag("--require-test-pocketbase") || process.env.REQUIRE_TEST_POCKETBASE === "true") {
  await cleanupPlaywrightArtifacts();
}
console.log("Buscando medico demo...");

const DEMO_DATE = env.DEMO_AGENDA_DATE || process.env.DEMO_AGENDA_DATE || "2026-05-15";
const DEMO_WEEKDAY = new Date(`${DEMO_DATE}T12:00:00`).getDay();

const medico = await findFirstRecord("users", 'email = "medico.demo@consultorio.local"');
if (!medico) {
  throw new Error("No existe medico.demo@consultorio.local. Ejecuta primero scripts/seed_usuarios_prueba.mjs");
}

const medicoDos = await findFirstRecord("users", 'email = "medico.dos.demo@consultorio.local"');
if (!medicoDos) {
  throw new Error("No existe medico.dos.demo@consultorio.local. Ejecuta primero scripts/seed_usuarios_prueba.mjs");
}

const pacienteLibre = await upsertPaciente({
  nombre: "Paciente",
  apellido: "Libre Demo",
  numero_documento: "99000001",
  telefono: "2604000001",
  email: "paciente.libre.demo@consultorio.local",
  ocupacion: "DOCENTE",
});

const pacienteOcupado = await upsertPaciente({
  nombre: "Paciente",
  apellido: "Ocupado Demo",
  numero_documento: "99000002",
  telefono: "2604000002",
  email: "paciente.ocupado.demo@consultorio.local",
  ocupacion: "COMERCIANTE",
});

const pacienteDuplicadoPrincipal = await upsertPaciente({
  nombre: "Paciente",
  apellido: "Duplicado Principal Demo",
  numero_documento: "99000901",
  telefono: "2604999000",
  email: "duplicado.principal.demo@consultorio.local",
});

const pacienteDuplicadoSecundario = await upsertPaciente({
  nombre: "Paciente",
  apellido: "Duplicado Secundario Demo",
  numero_documento: "99000902",
  telefono: "2604999000",
  email: "duplicado.secundario.demo@consultorio.local",
});

const disponibilidad = await upsertDisponibilidad({
  medico_id: medico.id,
  fecha_hora_inicio: localIso(DEMO_DATE, "09:00"),
  fecha_hora_fin: localIso(DEMO_DATE, "12:00"),
  tipo: "Consulta",
});

await upsertTurno({
  medico_id: medico.id,
  paciente_id: pacienteOcupado.id,
  disponibilidad_id: disponibilidad.id,
  fecha_hora: localIso(DEMO_DATE, "09:15"),
  duracion: 15,
  tipo: "Consulta",
  motivo: "Turno ocupado demo",
  estado: "En espera",
  es_sobreturno: false,
});

const consultaDemo = await upsertConsulta({
  medico_id: medico.id,
  paciente_id: pacienteLibre.id,
  fecha: localIso(DEMO_DATE, "08:30"),
  motivo_consulta: "Consulta atribuida demo",
  diagnostico: "Diagnostico demo con medico",
  tratamiento: "Tratamiento demo",
  estado: "finalizada",
});

await upsertReceta({
  medico_id: medico.id,
  paciente_id: pacienteLibre.id,
  consulta_id: consultaDemo.id,
  fecha: localIso(DEMO_DATE, "08:45"),
  medicamentos: "Receta atribuida demo",
  indicaciones: "Indicaciones demo",
});

await upsertDisponibilidad({
  medico_id: medicoDos.id,
  fecha_hora_inicio: localIso(DEMO_DATE, "10:00"),
  fecha_hora_fin: localIso(DEMO_DATE, "11:00"),
  tipo: "Consulta",
});

await upsertAgendaSemanal({
  medico_id: medico.id,
  dia_semana: DEMO_WEEKDAY,
  hora_inicio: "09:00",
  hora_fin: "12:00",
  tipo: "Consulta",
  duracion_minutos: 15,
  activo: true,
});

await upsertAgendaSemanal({
  medico_id: medicoDos.id,
  dia_semana: DEMO_WEEKDAY,
  hora_inicio: "10:00",
  hora_fin: "11:00",
  tipo: "Consulta",
  duracion_minutos: 15,
  activo: true,
});

await upsertBloqueoAgenda({
  alcance: "general",
  fecha_inicio: localIso(DEMO_DATE, "13:00"),
  fecha_fin: localIso(DEMO_DATE, "13:30"),
  hora_inicio: "13:00",
  hora_fin: "13:30",
  dia_completo: false,
  motivo: "Bloqueo demo sin turnos",
});

console.log("Datos demo de agenda listos:");
console.log(`- Fecha: ${DEMO_DATE}`);
console.log(`- Medico: ${medico.email}`);
console.log(`- Disponibilidad: 09:00 - 12:00`);
console.log(`- Horario recurrente medico: viernes 09:00 - 12:00`);
console.log(`- Segundo medico: ${medicoDos.email}`);
console.log(`- Disponibilidad segundo medico: 10:00 - 11:00`);
console.log(`- Horario recurrente segundo medico: viernes 10:00 - 11:00`);
console.log(`- Bloqueo general demo: 13:00 - 13:30`);
console.log(`- Horario ocupado: 09:15 (${pacienteOcupado.apellido}, ${pacienteOcupado.nombre})`);
console.log(`- Paciente libre para pruebas: ${pacienteLibre.apellido}, ${pacienteLibre.nombre} DNI ${pacienteLibre.numero_documento}`);
console.log(`- Pacientes duplicados demo: ${pacienteDuplicadoPrincipal.numero_documento} y ${pacienteDuplicadoSecundario.numero_documento}`);
console.log(`- Consulta y receta demo atribuidas a: ${medico.email}`);

async function upsertPaciente(data) {
  console.log(`Preparando paciente demo ${data.numero_documento}...`);
  const existing = await findFirstRecord("pacientes", `numero_documento = "${data.numero_documento}"`);
  if (existing) {
    return pb(`/api/collections/pacientes/records/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  return pb("/api/collections/pacientes/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function cleanupPlaywrightArtifacts() {
  console.log("Limpiando turnos Playwright de testing...");
  const turnos = await listRecords("turnos", 'motivo ~ "Playwright"');

  for (const turno of turnos) {
    const eventos = await listRecords("turno_eventos", `turno_id = "${turno.id}"`).catch(() => []);
    for (const evento of eventos) {
      await pb(`/api/collections/turno_eventos/records/${encodeURIComponent(evento.id)}`, { method: "DELETE" });
    }
    await pb(`/api/collections/turnos/records/${encodeURIComponent(turno.id)}`, { method: "DELETE" });
  }
}

async function listRecords(collection, filter) {
  const params = new URLSearchParams({ page: "1", perPage: "200", filter });
  const result = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
  return result.items || [];
}

async function upsertDisponibilidad(data) {
  console.log("Preparando disponibilidad demo...");
  const existing = await findFirstRecord(
    "disponibilidades",
    `medico_id = "${data.medico_id}" && fecha_hora_inicio = "${data.fecha_hora_inicio.replace("T", " ")}"`
  );

  if (existing) {
    return pb(`/api/collections/disponibilidades/records/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  return pb("/api/collections/disponibilidades/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function upsertAgendaSemanal(data) {
  console.log("Preparando regla semanal demo...");
  const existing = await findFirstRecord(
    "agenda_semanal_medico",
    `medico_id = "${data.medico_id}" && dia_semana = ${data.dia_semana} && hora_inicio = "${data.hora_inicio}" && tipo = "${data.tipo}"`
  );

  if (existing) {
    return pb(`/api/collections/agenda_semanal_medico/records/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  return pb("/api/collections/agenda_semanal_medico/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function upsertBloqueoAgenda(data) {
  console.log("Preparando bloqueo demo...");
  const existing = await findFirstRecord("bloqueos_agenda", `motivo = "${data.motivo}"`);

  if (existing) {
    return pb(`/api/collections/bloqueos_agenda/records/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  return pb("/api/collections/bloqueos_agenda/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function upsertTurno(data) {
  console.log("Preparando turno ocupado demo...");
  const existing = await findFirstRecord(
    "turnos",
    `medico_id = "${data.medico_id}" && fecha_hora = "${data.fecha_hora.replace("T", " ")}"`
  );

  if (existing) {
    return pb(`/api/collections/turnos/records/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  return pb("/api/collections/turnos/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function upsertConsulta(data) {
  console.log("Preparando consulta atribuida demo...");
  const existing = await findFirstRecord(
    "consultas",
    `paciente_id = "${data.paciente_id}" && motivo_consulta = "${data.motivo_consulta}"`
  );

  if (existing) {
    return pb(`/api/collections/consultas/records/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  return pb("/api/collections/consultas/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function upsertReceta(data) {
  console.log("Preparando receta atribuida demo...");
  const existing = await findFirstRecord(
    "recetas",
    `paciente_id = "${data.paciente_id}" && medicamentos = "${data.medicamentos}"`
  );

  if (existing) {
    return pb(`/api/collections/recetas/records/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  return pb("/api/collections/recetas/records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function findFirstRecord(collection, filter) {
  const params = new URLSearchParams({ page: "1", perPage: "1", filter });
  const result = await pb(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
  return result.items?.[0] || null;
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
  if (env.POCKETBASE_ADMIN_TOKEN) return env.POCKETBASE_ADMIN_TOKEN;

  if (!env.POCKETBASE_ADMIN_EMAIL || !env.POCKETBASE_ADMIN_PASSWORD) {
    throw new Error(`Configura POCKETBASE_ADMIN_TOKEN o POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD en ${envFile}`);
  }

  const body = JSON.stringify({
    identity: env.POCKETBASE_ADMIN_EMAIL,
    password: env.POCKETBASE_ADMIN_PASSWORD,
  });

  let response = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
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

function localIso(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}


function loadEnv(path) {
  if (!fs.existsSync(path)) return {};
  const result = {};

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
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
