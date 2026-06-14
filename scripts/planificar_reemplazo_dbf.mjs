import path from "node:path";
import { buildLegacyDbfImportPlan, writeLegacyDbfImportPlan } from "./legacy_dbf_import_plan.mjs";

const DATA_DIR = argValue("--data-dir") || "data";
const OUTPUT_DIR = argValue("--output-dir") || path.join(DATA_DIR, "reports", `legacy-dbf-import-plan-${timestampForPath(new Date())}`);

const plan = buildLegacyDbfImportPlan({ dataDir: DATA_DIR });
writeLegacyDbfImportPlan(plan, OUTPUT_DIR);

console.log("--- Plan de importacion DBF legacy ---");
console.log(`Reportes: ${OUTPUT_DIR}`);
console.log(`Mutuales a importar: ${plan.summary.mutualesAImportar}`);
console.log(`Pacientes a importar: ${plan.summary.pacientesAImportar}`);
console.log(`Pacientes consolidados: ${plan.summary.pacientesConsolidados}`);
console.log(`Fichas ambiguas: ${plan.summary.fichasAmbiguas}`);
console.log(`Consultas seguras a importar: ${plan.summary.consultasSegurasAImportar}`);
console.log(`Consultas huerfanas: ${plan.summary.consultasHuerfanas}`);
console.log(`Consultas ambiguas omitidas: ${plan.summary.consultasAmbiguas}`);
console.log(`Diagnosticos de paciente a importar: ${plan.summary.diagnosticosPacienteAImportar}`);
console.log("No se aplicaron cambios en PocketBase.");

function timestampForPath(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function argValue(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}
