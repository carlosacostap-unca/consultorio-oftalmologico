import fs from "node:fs";
import path from "node:path";
import {
  boolFromLegacy,
  normalizeCode,
  normalizeDocument,
  normalizeFicha,
  normalizeIdentityText,
  normalizeText,
  readDbf,
  writeCsv,
  writeJson,
} from "./dbf_utils.mjs";

const DATA_DIR = argValue("--data-dir") || "data";
const REPORTS_DIR = argValue("--reports-dir") || path.join(DATA_DIR, "reports");
const RUN_ID = argValue("--run-id") || timestampForPath(new Date());
const OUTPUT_DIR = path.join(REPORTS_DIR, `legacy-dbf-diagnostico-${RUN_ID}`);
const SAMPLE_LIMIT = Number(argValue("--sample-limit") || 10);

const sourcePaths = {
  mutuales: path.join(DATA_DIR, "MUTUALES.DBF"),
  pacientes: path.join(DATA_DIR, "PACIENTE.DBF"),
  consultas: path.join(DATA_DIR, "DATOMED.DBF"),
};

const mutualesDbf = readDbf(sourcePaths.mutuales);
const pacientesDbf = readDbf(sourcePaths.pacientes);
const consultasDbf = readDbf(sourcePaths.consultas);

const mutualRows = mutualesDbf.rows();
const patientRows = pacientesDbf.rows();
const consultationRows = consultasDbf.rows();

const mutualAnalysis = analyzeMutuales(mutualRows);
const patientAnalysis = analyzePacientes(patientRows, mutualAnalysis);
const consultationAnalysis = analyzeConsultas(consultationRows, patientAnalysis);
const legacyDiagnosisAnalysis = analyzePatientDiagnoses(patientAnalysis.patients);

const summary = {
  generatedAt: new Date().toISOString(),
  mode: "dry-run",
  sourcePaths,
  outputDir: OUTPUT_DIR,
  dbf: {
    mutuales: dbfMetadata(mutualesDbf, mutualRows.length),
    pacientes: dbfMetadata(pacientesDbf, patientRows.length),
    consultas: dbfMetadata(consultasDbf, consultationRows.length),
  },
  mutuales: {
    importables: mutualAnalysis.importableCount,
    uniqueCodes: mutualAnalysis.codeToMutuales.size,
    emptyCodeGroups: mutualAnalysis.emptyCodeMutuales.length,
    duplicateCodeGroups: mutualAnalysis.duplicateCodeGroups.length,
    patientCodesMissingInMutuales: patientAnalysis.missingMutualCodes.length,
    patientCodesMissingRecords: sum(patientAnalysis.missingMutualCodes.map((item) => item.patientCount)),
  },
  pacientes: {
    importablesBeforeConsolidation: patientAnalysis.patients.length,
    withoutFicha: patientAnalysis.withoutFicha.length,
    uniqueFichas: patientAnalysis.byFicha.size,
    duplicateFichaGroups: patientAnalysis.duplicateFichaGroups.length,
    consolidableDuplicateFichaGroups: patientAnalysis.consolidableDuplicateGroups.length,
    ambiguousDuplicateFichaGroups: patientAnalysis.ambiguousDuplicateGroups.length,
    rowsInDuplicateFichaGroups: sum(patientAnalysis.duplicateFichaGroups.map((group) => group.records.length)),
    rowsInConsolidableDuplicateGroups: sum(patientAnalysis.consolidableDuplicateGroups.map((group) => group.records.length)),
    rowsInAmbiguousDuplicateGroups: sum(patientAnalysis.ambiguousDuplicateGroups.map((group) => group.records.length)),
    historicalDiagnosisCandidates: legacyDiagnosisAnalysis.totalWithDiagnosis,
  },
  consultas: {
    totalRows: consultationRows.length,
    withoutFicha: consultationAnalysis.withoutFicha.length,
    withSafePatientFicha: consultationAnalysis.safeConsultationCount,
    affectedByAmbiguousFicha: consultationAnalysis.ambiguousConsultationCount,
    orphanRecords: consultationAnalysis.orphanConsultationCount,
    orphanFichaGroups: consultationAnalysis.orphanFichaGroups.length,
    noDate: consultationAnalysis.noDateCount,
    withClinicalText: consultationAnalysis.withClinicalTextCount,
  },
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
writeOutputs({
  summary,
  mutualAnalysis,
  patientAnalysis,
  consultationAnalysis,
  legacyDiagnosisAnalysis,
});

printSummary(summary);

function analyzeMutuales(rows) {
  const codeToMutuales = new Map();
  const emptyCodeMutuales = [];
  const importable = [];

  for (const row of rows) {
    const mutual = {
      sourceIndex: row.__index,
      nombre: normalizeText(row.NOM_MUT),
      codigo: normalizeCode(row.COD_MUT),
      direccion: normalizeText(row.DIR_MUT),
      telefono: normalizeText(row.TEL_MUT),
      codAran: normalizeCode(row.COD_ARAN),
      porcentaje: normalizeCode(row.PORCEN),
      discri: normalizeText(row.DISCRI),
      medicam: normalizeText(row.MEDICAM),
    };

    importable.push(mutual);

    if (!mutual.codigo) {
      emptyCodeMutuales.push(mutual);
      continue;
    }

    if (!codeToMutuales.has(mutual.codigo)) codeToMutuales.set(mutual.codigo, []);
    codeToMutuales.get(mutual.codigo).push(mutual);
  }

  const duplicateCodeGroups = [...codeToMutuales.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([codigo, items]) => ({ codigo, count: items.length, items }));

  return {
    importable,
    importableCount: importable.length,
    codeToMutuales,
    emptyCodeMutuales,
    duplicateCodeGroups,
  };
}

function analyzePacientes(rows, mutualAnalysis) {
  const patients = [];
  const byFicha = new Map();
  const withoutFicha = [];
  const mutualCodeUse = new Map();

  for (const row of rows) {
    const patient = normalizePatient(row);
    patients.push(patient);

    if (!patient.ficha) {
      withoutFicha.push(patient);
    } else {
      pushMapArray(byFicha, patient.ficha, patient);
    }

    const codeKey = patient.codigoMutual || "";
    if (!mutualCodeUse.has(codeKey)) {
      mutualCodeUse.set(codeKey, { codigo: codeKey, patientCount: 0, examples: [] });
    }
    const codeUse = mutualCodeUse.get(codeKey);
    codeUse.patientCount += 1;
    pushLimited(codeUse.examples, patientExample(patient), SAMPLE_LIMIT);
  }

  const duplicateFichaGroups = [...byFicha.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([ficha, records]) => {
      const identityKeys = new Set(records.map((record) => record.identityKey));
      const documentKeys = new Set(records.map((record) => record.documento).filter(Boolean));
      return {
        ficha,
        count: records.length,
        identityCount: identityKeys.size,
        documentCount: documentKeys.size,
        classification: identityKeys.size === 1 ? "consolidable" : "ambiguous",
        records,
      };
    })
    .sort((a, b) => b.count - a.count || a.ficha.localeCompare(b.ficha, "es", { numeric: true }));

  const consolidableDuplicateGroups = duplicateFichaGroups.filter((group) => group.classification === "consolidable");
  const ambiguousDuplicateGroups = duplicateFichaGroups.filter((group) => group.classification === "ambiguous");
  const ambiguousFichaSet = new Set(ambiguousDuplicateGroups.map((group) => group.ficha));
  const consolidableFichaSet = new Set(consolidableDuplicateGroups.map((group) => group.ficha));

  const missingMutualCodes = [...mutualCodeUse.values()]
    .filter((item) => item.codigo && !mutualAnalysis.codeToMutuales.has(item.codigo))
    .sort((a, b) => b.patientCount - a.patientCount || a.codigo.localeCompare(b.codigo, "es", { numeric: true }));

  const emptyMutualCode = mutualCodeUse.get("") || { codigo: "", patientCount: 0, examples: [] };

  return {
    patients,
    byFicha,
    withoutFicha,
    duplicateFichaGroups,
    consolidableDuplicateGroups,
    ambiguousDuplicateGroups,
    ambiguousFichaSet,
    consolidableFichaSet,
    mutualCodeUse,
    missingMutualCodes,
    emptyMutualCode,
  };
}

function analyzeConsultas(rows, patientAnalysis) {
  const byFicha = new Map();
  const withoutFicha = [];
  let noDateCount = 0;
  let withClinicalTextCount = 0;
  let safeConsultationCount = 0;
  let ambiguousConsultationCount = 0;
  let orphanConsultationCount = 0;

  for (const row of rows) {
    const consulta = normalizeConsulta(row);
    if (!consulta.ficha) {
      withoutFicha.push(consulta);
      continue;
    }

    const group = ensureConsultaGroup(byFicha, consulta.ficha);
    group.count += 1;
    if (consulta.fecha) {
      group.firstDate = minDate(group.firstDate, consulta.fecha);
      group.lastDate = maxDate(group.lastDate, consulta.fecha);
    }
    if (consulta.hasClinicalText) group.withClinicalText += 1;
    pushLimited(group.examples, consultaExample(consulta), SAMPLE_LIMIT);

    if (!consulta.fecha) noDateCount += 1;
    if (consulta.hasClinicalText) withClinicalTextCount += 1;

    if (!patientAnalysis.byFicha.has(consulta.ficha)) {
      orphanConsultationCount += 1;
      continue;
    }

    if (patientAnalysis.ambiguousFichaSet.has(consulta.ficha)) {
      ambiguousConsultationCount += 1;
      continue;
    }

    safeConsultationCount += 1;
  }

  const orphanFichaGroups = [...byFicha.values()]
    .filter((group) => !patientAnalysis.byFicha.has(group.ficha))
    .sort(compareConsultaGroups);

  const ambiguousFichaGroups = [...byFicha.values()]
    .filter((group) => patientAnalysis.ambiguousFichaSet.has(group.ficha))
    .sort(compareConsultaGroups);

  return {
    byFicha,
    withoutFicha,
    noDateCount,
    withClinicalTextCount,
    safeConsultationCount,
    ambiguousConsultationCount,
    orphanConsultationCount,
    orphanFichaGroups,
    ambiguousFichaGroups,
  };
}

function analyzePatientDiagnoses(patients) {
  const candidates = [];
  let withDiagnosisAndDate = 0;
  let withDiagnosisNoDate = 0;
  let withDateNoDiagnosis = 0;

  for (const patient of patients) {
    if (patient.diagnosticoLegacy) {
      if (patient.presuntivo) withDiagnosisAndDate += 1;
      else withDiagnosisNoDate += 1;

      candidates.push({
        ficha: patient.ficha,
        sourceIndex: patient.sourceIndex,
        paciente: patientLabel(patient),
        documento: patient.documento,
        diagnosticoLegacy: patient.diagnosticoLegacy,
        presuntivo: patient.presuntivo,
      });
    } else if (patient.presuntivo) {
      withDateNoDiagnosis += 1;
    }
  }

  return {
    totalWithDiagnosis: candidates.length,
    withDiagnosisAndDate,
    withDiagnosisNoDate,
    withDateNoDiagnosis,
    candidates,
  };
}

function normalizePatient(row) {
  const apellido = normalizeText(row.APELLIDOS);
  const nombre = normalizeText(row.NOMBRES);
  const documento = normalizeDocument(row.DOCUM);
  const fechaNacimiento = normalizeText(row.FEC_NACI);

  return {
    sourceIndex: row.__index,
    ficha: normalizeFicha(row.NUM_FICH),
    apellido,
    nombre,
    domicilio: normalizeText(row.DOMICI),
    telefono: normalizeText(row.TELE),
    ocupacion: normalizeText(row.OCUPAC),
    nacionalidad: normalizeText(row.NACION),
    codigoMutual: normalizeCode(row.COD_MUTU),
    documento,
    tipoDocumento: normalizeText(row.TIPO),
    numeroAfiliado: normalizeText(row.NUM_AF),
    diagnosticoLegacy: normalizeText(row.DIAGNO),
    presuntivo: normalizeText(row.PRESUNTIVO),
    fechaNacimiento,
    antecedentes: {
      alergia: boolFromLegacy(row.ALERGIA),
      asma: boolFromLegacy(row.ASMA),
      reuma: boolFromLegacy(row.REUMA),
      gota: boolFromLegacy(row.GOTA),
      herpes: boolFromLegacy(row.HERPES),
      diabetes: boolFromLegacy(row.DIABETE),
      otro: normalizeText(row.OTROANTEC),
    },
    estadoCivil: normalizeText(row.EST_CIV),
    sexo: normalizeText(row.SEXO),
    edad: normalizeText(row.EDAD),
    tipoEdad: normalizeText(row.TIP_EDAD),
    identityKey: [
      normalizeIdentityText(apellido),
      normalizeIdentityText(nombre),
      documento,
      fechaNacimiento,
    ].join("|"),
  };
}

function normalizeConsulta(row) {
  const motivo = normalizeText(row.MOT_CONS);
  const diagnostico = normalizeText(row.MED_DIAG);
  const tratamiento = normalizeText(row.TRATA);
  const fondoOjo = normalizeText(row.FONDO_OJO);

  return {
    sourceIndex: row.__index,
    ficha: normalizeFicha(row.NUM_FICH),
    fecha: normalizeText(row.MED_FEC),
    motivo,
    avScOd: normalizeText(row.AG_VI_SCD),
    avScOi: normalizeText(row.AG_VI_SCI),
    avCcOd: normalizeText(row.AG_VI_CCD),
    avCcOi: normalizeText(row.AG_VI_CCI),
    refLejosOdEsf: normalizeText(row.LEJ_ESF_D),
    refLejosOdCil: normalizeText(row.LEJ_CIL_D),
    refLejosOdEje: normalizeText(row.LEJ_GRA_D),
    refLejosOiEsf: normalizeText(row.LEJ_ESF_I),
    refLejosOiCil: normalizeText(row.LEJ_CIL_I),
    refLejosOiEje: normalizeText(row.LEJ_GRA_I),
    refCercaOdEsf: normalizeText(row.CER_ESF_D),
    refCercaOdCil: normalizeText(row.CER_CIL_D),
    refCercaOdEje: normalizeText(row.CER_GRA_D),
    refCercaOiEsf: normalizeText(row.CER_ESF_I),
    refCercaOiCil: normalizeText(row.CER_CIL_I),
    refCercaOiEje: normalizeText(row.CER_GRA_I),
    pioOd: normalizeText(row.PRE_OCU_D),
    pioOi: normalizeText(row.PRE_OCU_I),
    fondoOjo,
    tratamiento,
    diagnostico,
    hasClinicalText: Boolean(motivo || diagnostico || tratamiento || fondoOjo),
  };
}

function writeOutputs({
  summary,
  mutualAnalysis,
  patientAnalysis,
  consultationAnalysis,
  legacyDiagnosisAnalysis,
}) {
  writeJson(path.join(OUTPUT_DIR, "summary.json"), summary);

  const duplicateRows = patientAnalysis.duplicateFichaGroups.map((group) => ({
    ficha: group.ficha,
    classification: group.classification,
    count: group.count,
    identityCount: group.identityCount,
    documentCount: group.documentCount,
    consultationCount: consultationAnalysis.byFicha.get(group.ficha)?.count || 0,
    firstConsultationDate: consultationAnalysis.byFicha.get(group.ficha)?.firstDate || "",
    lastConsultationDate: consultationAnalysis.byFicha.get(group.ficha)?.lastDate || "",
    examples: group.records.slice(0, SAMPLE_LIMIT).map(patientLabel).join(" | "),
  }));
  writeJson(path.join(OUTPUT_DIR, "fichas-duplicadas.json"), duplicateRows);
  writeCsv(path.join(OUTPUT_DIR, "fichas-duplicadas.csv"), duplicateRows, [
    { key: "ficha" },
    { key: "classification" },
    { key: "count" },
    { key: "identityCount" },
    { key: "documentCount" },
    { key: "consultationCount" },
    { key: "firstConsultationDate" },
    { key: "lastConsultationDate" },
    { key: "examples" },
  ]);

  const orphanRows = consultationAnalysis.orphanFichaGroups.map((group) => ({
    ficha: group.ficha,
    count: group.count,
    firstDate: group.firstDate,
    lastDate: group.lastDate,
    withClinicalText: group.withClinicalText,
    examples: group.examples.map((example) => example.resumen).join(" | "),
  }));
  writeJson(path.join(OUTPUT_DIR, "consultas-huerfanas.json"), orphanRows);
  writeCsv(path.join(OUTPUT_DIR, "consultas-huerfanas.csv"), orphanRows, [
    { key: "ficha" },
    { key: "count" },
    { key: "firstDate" },
    { key: "lastDate" },
    { key: "withClinicalText" },
    { key: "examples" },
  ]);

  const ambiguousRows = consultationAnalysis.ambiguousFichaGroups.map((group) => ({
    ficha: group.ficha,
    count: group.count,
    firstDate: group.firstDate,
    lastDate: group.lastDate,
    withClinicalText: group.withClinicalText,
    duplicatePatients: patientAnalysis.byFicha.get(group.ficha).map(patientLabel).join(" | "),
  }));
  writeJson(path.join(OUTPUT_DIR, "consultas-fichas-ambiguas.json"), ambiguousRows);
  writeCsv(path.join(OUTPUT_DIR, "consultas-fichas-ambiguas.csv"), ambiguousRows, [
    { key: "ficha" },
    { key: "count" },
    { key: "firstDate" },
    { key: "lastDate" },
    { key: "withClinicalText" },
    { key: "duplicatePatients" },
  ]);

  const missingMutualRows = patientAnalysis.missingMutualCodes.map((item) => ({
    codigo: item.codigo,
    patientCount: item.patientCount,
    examples: item.examples.map((example) => example.resumen).join(" | "),
  }));
  writeJson(path.join(OUTPUT_DIR, "codigos-mutual-sin-coincidencia.json"), missingMutualRows);
  writeCsv(path.join(OUTPUT_DIR, "codigos-mutual-sin-coincidencia.csv"), missingMutualRows, [
    { key: "codigo" },
    { key: "patientCount" },
    { key: "examples" },
  ]);

  const duplicateMutualCodeRows = mutualAnalysis.duplicateCodeGroups.map((group) => ({
    codigo: group.codigo,
    count: group.count,
    mutuales: group.items.map((item) => `${item.nombre} (#${item.sourceIndex})`).join(" | "),
  }));
  writeJson(path.join(OUTPUT_DIR, "codigos-mutual-duplicados.json"), duplicateMutualCodeRows);
  writeCsv(path.join(OUTPUT_DIR, "codigos-mutual-duplicados.csv"), duplicateMutualCodeRows, [
    { key: "codigo" },
    { key: "count" },
    { key: "mutuales" },
  ]);

  writeJson(
    path.join(OUTPUT_DIR, "diagnosticos-paciente-legacy.json"),
    legacyDiagnosisAnalysis.candidates,
  );
  writeCsv(path.join(OUTPUT_DIR, "diagnosticos-paciente-legacy.csv"), legacyDiagnosisAnalysis.candidates, [
    { key: "ficha" },
    { key: "sourceIndex" },
    { key: "paciente" },
    { key: "documento" },
    { key: "diagnosticoLegacy" },
    { key: "presuntivo" },
  ]);
}

function printSummary(summary) {
  console.log("\n--- Diagnostico reemplazo DBF legacy ---");
  console.log(`Modo: ${summary.mode}`);
  console.log(`Reportes: ${summary.outputDir}`);
  console.log("\nOrigen DBF");
  console.log(`- Mutuales: ${summary.dbf.mutuales.activeRecords}/${summary.dbf.mutuales.recordCount} activas`);
  console.log(`- Pacientes: ${summary.dbf.pacientes.activeRecords}/${summary.dbf.pacientes.recordCount} activos`);
  console.log(`- Consultas: ${summary.dbf.consultas.activeRecords}/${summary.dbf.consultas.recordCount} activas`);
  console.log("\nExcepciones principales");
  console.log(`- Fichas duplicadas: ${summary.pacientes.duplicateFichaGroups}`);
  console.log(`  - consolidables: ${summary.pacientes.consolidableDuplicateFichaGroups}`);
  console.log(`  - ambiguas: ${summary.pacientes.ambiguousDuplicateFichaGroups}`);
  console.log(`- Consultas huerfanas: ${summary.consultas.orphanRecords} en ${summary.consultas.orphanFichaGroups} fichas`);
  console.log(`- Consultas con ficha ambigua: ${summary.consultas.affectedByAmbiguousFicha}`);
  console.log(`- Codigos de mutual usados por pacientes sin coincidencia: ${summary.mutuales.patientCodesMissingInMutuales}`);
  console.log(`- Diagnosticos legacy de paciente: ${summary.pacientes.historicalDiagnosisCandidates}`);
  console.log("\nNo se aplicaron cambios en PocketBase.");
  console.log("Para aplicar reemplazo real se requiere implementar y ejecutar el flujo con --apply y backup previo.");
}

function dbfMetadata(dbf, activeRecords) {
  return {
    path: dbf.path,
    recordCount: dbf.recordCount,
    activeRecords,
    deletedRecords: dbf.recordCount - activeRecords,
    headerLength: dbf.headerLength,
    recordLength: dbf.recordLength,
    lastUpdate: dbf.lastUpdate,
    fields: dbf.fields.map((field) => ({
      name: field.name,
      type: field.type,
      length: field.length,
      decimals: field.decimals,
    })),
  };
}

function ensureConsultaGroup(map, ficha) {
  if (!map.has(ficha)) {
    map.set(ficha, {
      ficha,
      count: 0,
      firstDate: "",
      lastDate: "",
      withClinicalText: 0,
      examples: [],
    });
  }
  return map.get(ficha);
}

function pushMapArray(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function pushLimited(array, value, limit) {
  if (array.length < limit) array.push(value);
}

function patientExample(patient) {
  return {
    ficha: patient.ficha,
    resumen: patientLabel(patient),
  };
}

function consultaExample(consulta) {
  return {
    ficha: consulta.ficha,
    fecha: consulta.fecha,
    resumen: `${consulta.fecha || "sin fecha"}: ${consulta.motivo || consulta.diagnostico || consulta.tratamiento || consulta.fondoOjo || "sin texto"}`,
  };
}

function patientLabel(patient) {
  return `${patient.apellido}, ${patient.nombre} | doc ${patient.documento || "-"} | nac ${patient.fechaNacimiento || "-"} | fila ${patient.sourceIndex}`;
}

function minDate(current, candidate) {
  if (!candidate) return current || "";
  if (!current) return candidate;
  return candidate < current ? candidate : current;
}

function maxDate(current, candidate) {
  if (!candidate) return current || "";
  if (!current) return candidate;
  return candidate > current ? candidate : current;
}

function compareConsultaGroups(a, b) {
  return b.count - a.count || a.ficha.localeCompare(b.ficha, "es", { numeric: true });
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function timestampForPath(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function argValue(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}
