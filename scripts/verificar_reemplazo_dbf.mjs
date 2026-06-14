import path from "node:path";
import { buildLegacyDbfImportPlan } from "./legacy_dbf_import_plan.mjs";
import { adminEnvFromArgs, createPocketBaseAdminClient } from "./pocketbase_admin_utils.mjs";

const DATA_DIR = argValue("--data-dir") || "data";
const plan = buildLegacyDbfImportPlan({ dataDir: DATA_DIR });
const { envFile, env, url } = adminEnvFromArgs(".env.local");
const pb = await createPocketBaseAdminClient({ url, env, envFile, name: "PocketBase" });

const expected = {
  mutuales: plan.summary.mutualesAImportar,
  pacientes: plan.summary.pacientesAImportar,
  consultas: plan.summary.consultasSegurasAImportar + plan.summary.diagnosticosPacienteAImportar,
  diagnosticosLegacy: plan.summary.diagnosticosPacienteAImportar,
};

const actual = {
  mutuales: await pb.count("mutuales"),
  pacientes: await pb.count("pacientes"),
  consultas: await pb.count("consultas"),
  diagnosticosLegacy: await pb.count("consultas", 'motivo_consulta = "Registro legacy de paciente"'),
};

const samples = {
  mutualNormal: await first("mutuales", 'codigo = "1"', "nombre,codigo"),
  mutualSinCobertura: await first("mutuales", 'codigo = "LEGACY-0"', "nombre,codigo"),
  mutualNoIdentificada: await first("mutuales", 'codigo = "LEGACY-SIN-ID"', "nombre,codigo"),
  pacienteConsolidado6466: await first("pacientes", 'numero_ficha = "6466"', "apellido,nombre,numero_ficha,numero_documento,obra_social"),
  consultasFicha6466: await pb.count("consultas", 'numero_ficha = "6466"'),
  diagnosticoLegacyFicha6466: await first("consultas", 'numero_ficha = "6466" && motivo_consulta = "Registro legacy de paciente"', "numero_ficha,motivo_consulta,diagnostico,fecha"),
};

const mismatches = Object.entries(expected)
  .filter(([key, value]) => actual[key] !== value)
  .map(([key, value]) => ({ key, expected: value, actual: actual[key] }));

console.log("--- Verificacion reemplazo DBF ---");
console.log(`PocketBase: ${pb.url}`);
console.log(`Entorno: ${envFile}`);
console.log("Conteos esperados:", JSON.stringify(expected, null, 2));
console.log("Conteos actuales:", JSON.stringify(actual, null, 2));
console.log("Muestras:", JSON.stringify(samples, null, 2));

if (mismatches.length > 0) {
  console.error("Diferencias detectadas:", JSON.stringify(mismatches, null, 2));
  process.exitCode = 1;
} else {
  console.log("Conteos principales OK.");
}

async function first(collection, filter, fields) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    filter,
    fields,
  });
  const result = await pb.request(`/api/collections/${encodeURIComponent(collection)}/records?${params}`);
  return result.items[0] || null;
}

function argValue(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}
