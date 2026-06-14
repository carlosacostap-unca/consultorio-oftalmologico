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

export const ADMIN_MUTUALES = {
  noInformada: {
    legacyKey: "admin:sin-cobertura",
    nombre: "SIN COBERTURA / SIN MUTUAL INFORMADA",
    codigo: "LEGACY-0",
    direccion: "",
    telefono: "",
  },
  noIdentificada: {
    legacyKey: "admin:mutual-no-identificada",
    nombre: "MUTUAL LEGACY SIN IDENTIFICAR",
    codigo: "LEGACY-SIN-ID",
    direccion: "",
    telefono: "",
  },
};

export function buildLegacyDbfImportPlan({ dataDir = "data" } = {}) {
  const sourcePaths = {
    mutuales: path.join(dataDir, "MUTUALES.DBF"),
    pacientes: path.join(dataDir, "PACIENTE.DBF"),
    consultas: path.join(dataDir, "DATOMED.DBF"),
  };

  const mutualRows = readDbf(sourcePaths.mutuales).rows();
  const patientRows = readDbf(sourcePaths.pacientes).rows();
  const consultationRows = readDbf(sourcePaths.consultas).rows();

  const mutualPlan = buildMutualPlan(mutualRows, patientRows);
  const patientPlan = buildPatientPlan(patientRows, mutualPlan);
  const consultationPlan = buildConsultationPlan(consultationRows, patientPlan);
  const diagnosisPlan = buildPatientDiagnosisPlan(patientPlan);

  return {
    generatedAt: new Date().toISOString(),
    sourcePaths,
    mutuales: mutualPlan,
    pacientes: patientPlan,
    consultas: consultationPlan,
    diagnosticosPaciente: diagnosisPlan,
    summary: {
      mutualesAImportar: mutualPlan.records.length,
      pacientesAImportar: patientPlan.records.length,
      pacientesConsolidados: patientPlan.consolidatedGroups.length,
      fichasAmbiguas: patientPlan.ambiguousGroups.length,
      consultasSegurasAImportar: consultationPlan.records.length,
      consultasHuerfanas: consultationPlan.orphan.length,
      consultasAmbiguas: consultationPlan.ambiguous.length,
      diagnosticosPacienteAImportar: diagnosisPlan.records.length,
    },
  };
}

export function writeLegacyDbfImportPlan(plan, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  writeJson(path.join(outputDir, "import-plan-summary.json"), {
    generatedAt: plan.generatedAt,
    sourcePaths: plan.sourcePaths,
    summary: plan.summary,
  });

  writeJsonl(path.join(outputDir, "mutuales-plan.jsonl"), plan.mutuales.records);
  writeJsonl(path.join(outputDir, "pacientes-plan.jsonl"), plan.pacientes.records);
  writeJsonl(path.join(outputDir, "consultas-plan.jsonl"), plan.consultas.records);
  writeJsonl(path.join(outputDir, "diagnosticos-paciente-plan.jsonl"), plan.diagnosticosPaciente.records);
  writeJsonl(path.join(outputDir, "consultas-huerfanas-plan.jsonl"), plan.consultas.orphan);
  writeJsonl(path.join(outputDir, "consultas-ambiguas-plan.jsonl"), plan.consultas.ambiguous);

  writeCsv(path.join(outputDir, "fichas-ambiguas-plan.csv"), plan.pacientes.ambiguousGroups.map((group) => ({
    ficha: group.ficha,
    pacientes: group.records.length,
    ejemplos: group.records.map(patientLabel).join(" | "),
  })), [
    { key: "ficha" },
    { key: "pacientes" },
    { key: "ejemplos" },
  ]);
}

function buildMutualPlan(mutualRows, patientRows) {
  const records = [];
  const byLegacyCode = new Map();

  for (const row of mutualRows) {
    const codigo = normalizeCode(row.COD_MUT);
    if (!codigo) continue;

    const record = {
      legacyKey: `mutual:${codigo}`,
      legacyCodigo: codigo,
      payload: {
        nombre: normalizeText(row.NOM_MUT).toUpperCase(),
        codigo,
        direccion: normalizeText(row.DIR_MUT),
        telefono: normalizeText(row.TEL_MUT),
      },
    };

    if (!byLegacyCode.has(codigo)) {
      byLegacyCode.set(codigo, record);
      records.push(record);
    }
  }

  const missingCodes = missingPatientMutualCodes(patientRows, byLegacyCode);
  const administrativeByKey = new Map();
  for (const code of missingCodes) {
    const admin = adminMutualForCode(code);
    const existingAdmin = administrativeByKey.get(admin.legacyKey);
    if (existingAdmin) {
      byLegacyCode.set(code, existingAdmin);
      continue;
    }

    const record = {
      legacyKey: admin.legacyKey,
      legacyCodigo: admin.legacyCodigo,
      sourceLegacyCodigo: code,
      administrative: true,
      payload: {
        nombre: admin.nombre,
        codigo: admin.codigo,
        direccion: admin.direccion,
        telefono: admin.telefono,
      },
    };

    byLegacyCode.set(code, record);
    administrativeByKey.set(admin.legacyKey, record);
    records.push(record);
  }

  return { records, byLegacyCode, missingCodes };
}

function buildPatientPlan(patientRows, mutualPlan) {
  const byFicha = new Map();
  const withoutFicha = [];

  for (const row of patientRows) {
    const patient = normalizePatient(row);
    if (!patient.ficha) {
      withoutFicha.push(patient);
      continue;
    }
    pushMapArray(byFicha, patient.ficha, patient);
  }

  const records = [];
  const consolidatedGroups = [];
  const ambiguousGroups = [];
  const safeFichaToLegacyPatientKey = new Map();

  for (const [ficha, patients] of byFicha) {
    const identityKeys = new Set(patients.map((patient) => patient.identityKey));

    if (patients.length === 1 || identityKeys.size === 1) {
      const merged = mergePatients(patients);
      const record = patientRecord(merged, mutualPlan, { consolidatedFrom: patients.map((patient) => patient.sourceIndex) });
      records.push(record);
      safeFichaToLegacyPatientKey.set(ficha, record.legacyKey);
      if (patients.length > 1) {
        consolidatedGroups.push({ ficha, records: patients, selected: merged });
      }
      continue;
    }

    const ambiguousRecords = patients.map((patient) => patientRecord(patient, mutualPlan, { ambiguous: true }));
    records.push(...ambiguousRecords);
    ambiguousGroups.push({ ficha, records: patients });
  }

  for (const patient of withoutFicha) {
    records.push(patientRecord(patient, mutualPlan, { withoutFicha: true }));
  }

  return {
    records,
    byFicha,
    safeFichaToLegacyPatientKey,
    ambiguousFichaSet: new Set(ambiguousGroups.map((group) => group.ficha)),
    consolidatedGroups,
    ambiguousGroups,
    withoutFicha,
  };
}

function buildConsultationPlan(consultationRows, patientPlan) {
  const records = [];
  const orphan = [];
  const ambiguous = [];

  for (const row of consultationRows) {
    const consulta = normalizeConsulta(row);
    const baseRecord = consultationRecord(consulta);

    if (!consulta.ficha || !patientPlan.byFicha.has(consulta.ficha)) {
      orphan.push({ ...baseRecord, reason: "paciente_no_encontrado" });
      continue;
    }

    if (patientPlan.ambiguousFichaSet.has(consulta.ficha)) {
      ambiguous.push({ ...baseRecord, reason: "ficha_ambigua" });
      continue;
    }

    records.push({
      ...baseRecord,
      legacyPatientKey: patientPlan.safeFichaToLegacyPatientKey.get(consulta.ficha),
    });
  }

  return { records, orphan, ambiguous };
}

function buildPatientDiagnosisPlan(patientPlan) {
  const records = [];

  for (const patientRecordItem of patientPlan.records) {
    const source = patientRecordItem.source;
    if (!source?.diagnosticoLegacy) continue;

    records.push({
      legacyKey: `paciente-diagnostico:${patientRecordItem.legacyKey}`,
      legacyPatientKey: patientRecordItem.legacyKey,
      sourceIndexes: patientRecordItem.sourceIndexes,
      payload: {
        numero_ficha: patientRecordItem.payload.numero_ficha,
        fecha: source.presuntivo ? `${source.presuntivo} 12:00:00.000Z` : "",
        motivo_consulta: "Registro legacy de paciente",
        diagnostico: source.diagnosticoLegacy,
        estado: "finalizada",
      },
    });
  }

  return { records };
}

function patientRecord(patient, mutualPlan, flags = {}) {
  const mutual = mutualForPatient(patient, mutualPlan);
  const legacyKey = flags.ambiguous
    ? `paciente:${patient.ficha}:fila:${patient.sourceIndex}`
    : patient.ficha
      ? `paciente:${patient.ficha}`
      : `paciente:sin-ficha:fila:${patient.sourceIndex}`;

  return {
    legacyKey,
    sourceIndexes: flags.consolidatedFrom || [patient.sourceIndex],
    flags,
    source: patient,
    legacyMutualKey: mutual?.legacyKey || "",
    payload: {
      nombre: patient.nombre.toUpperCase(),
      apellido: patient.apellido.toUpperCase(),
      tipo_documento: patient.tipoDocumento || "DNI",
      numero_documento: patient.documento,
      telefono: patient.telefono,
      email: "",
      fecha_nacimiento: patient.fechaNacimiento ? `${patient.fechaNacimiento} 12:00:00.000Z` : "",
      obra_social: mutual?.payload?.nombre || "",
      numero_afiliado: patient.numeroAfiliado,
      domicilio: patient.domicilio,
      numero_ficha: patient.ficha,
      ocupacion: patient.ocupacion,
      ant_alergico: patient.antecedentes.alergia,
      ant_asmatico: patient.antecedentes.asma,
      ant_reuma: patient.antecedentes.reuma,
      ant_gota: patient.antecedentes.gota,
      ant_herpes: patient.antecedentes.herpes,
      ant_diabetes: patient.antecedentes.diabetes,
      ant_otra: patient.antecedentes.otro,
    },
  };
}

function consultationRecord(consulta) {
  return {
    legacyKey: `consulta:fila:${consulta.sourceIndex}`,
    sourceIndex: consulta.sourceIndex,
    payload: {
      numero_ficha: consulta.ficha,
      fecha: consulta.fecha ? `${consulta.fecha} 12:00:00.000Z` : "",
      motivo_consulta: consulta.motivo,
      av_sc_od: consulta.avScOd,
      av_sc_oi: consulta.avScOi,
      av_cc_od: consulta.avCcOd,
      av_cc_oi: consulta.avCcOi,
      ref_lejos_od_esf: consulta.refLejosOdEsf,
      ref_lejos_od_cil: consulta.refLejosOdCil,
      ref_lejos_od_eje: consulta.refLejosOdEje,
      ref_lejos_oi_esf: consulta.refLejosOiEsf,
      ref_lejos_oi_cil: consulta.refLejosOiCil,
      ref_lejos_oi_eje: consulta.refLejosOiEje,
      ref_cerca_od_esf: consulta.refCercaOdEsf,
      ref_cerca_od_cil: consulta.refCercaOdCil,
      ref_cerca_od_eje: consulta.refCercaOdEje,
      ref_cerca_oi_esf: consulta.refCercaOiEsf,
      ref_cerca_oi_cil: consulta.refCercaOiCil,
      ref_cerca_oi_eje: consulta.refCercaOiEje,
      pio_od: consulta.pioOd,
      pio_oi: consulta.pioOi,
      fondo_ojo: consulta.fondoOjo,
      tratamiento: consulta.tratamiento,
      diagnostico: consulta.diagnostico,
      estado: "finalizada",
    },
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
    identityKey: [
      normalizeIdentityText(apellido),
      normalizeIdentityText(nombre),
      documento,
      fechaNacimiento,
    ].join("|"),
  };
}

function normalizeConsulta(row) {
  return {
    sourceIndex: row.__index,
    ficha: normalizeFicha(row.NUM_FICH),
    fecha: normalizeText(row.MED_FEC),
    motivo: normalizeText(row.MOT_CONS),
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
    fondoOjo: normalizeText(row.FONDO_OJO),
    tratamiento: normalizeText(row.TRATA),
    diagnostico: normalizeText(row.MED_DIAG),
  };
}

function mergePatients(patients) {
  return patients.reduce((merged, current) => ({
    ...merged,
    nombre: bestText(merged.nombre, current.nombre),
    apellido: bestText(merged.apellido, current.apellido),
    domicilio: bestText(merged.domicilio, current.domicilio),
    telefono: bestText(merged.telefono, current.telefono),
    ocupacion: bestText(merged.ocupacion, current.ocupacion),
    codigoMutual: bestText(merged.codigoMutual, current.codigoMutual),
    documento: bestDocument(merged.documento, current.documento),
    tipoDocumento: bestText(merged.tipoDocumento, current.tipoDocumento),
    numeroAfiliado: bestText(merged.numeroAfiliado, current.numeroAfiliado),
    diagnosticoLegacy: bestText(merged.diagnosticoLegacy, current.diagnosticoLegacy),
    presuntivo: bestText(merged.presuntivo, current.presuntivo),
    fechaNacimiento: bestText(merged.fechaNacimiento, current.fechaNacimiento),
    antecedentes: {
      alergia: merged.antecedentes.alergia || current.antecedentes.alergia,
      asma: merged.antecedentes.asma || current.antecedentes.asma,
      reuma: merged.antecedentes.reuma || current.antecedentes.reuma,
      gota: merged.antecedentes.gota || current.antecedentes.gota,
      herpes: merged.antecedentes.herpes || current.antecedentes.herpes,
      diabetes: merged.antecedentes.diabetes || current.antecedentes.diabetes,
      otro: bestText(merged.antecedentes.otro, current.antecedentes.otro),
    },
  }), patients[0]);
}

function mutualForPatient(patient, mutualPlan) {
  if (patient.codigoMutual && mutualPlan.byLegacyCode.has(patient.codigoMutual)) {
    return mutualPlan.byLegacyCode.get(patient.codigoMutual);
  }
  if (!patient.codigoMutual || patient.codigoMutual === "0") return ADMIN_MUTUALES.noInformada;
  return ADMIN_MUTUALES.noIdentificada;
}

function adminMutualForCode(code) {
  if (!code || code === "0") {
    return { ...ADMIN_MUTUALES.noInformada, legacyCodigo: code || "0" };
  }
  return { ...ADMIN_MUTUALES.noIdentificada, legacyCodigo: code };
}

function missingPatientMutualCodes(patientRows, byLegacyCode) {
  const codes = new Set();
  for (const row of patientRows) {
    const code = normalizeCode(row.COD_MUTU);
    if (code && !byLegacyCode.has(code)) codes.add(code);
  }
  return [...codes].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

function writeJsonl(filePath, records) {
  const stream = fs.createWriteStream(filePath, { encoding: "utf8" });
  for (const record of records) {
    stream.write(`${JSON.stringify(record)}\n`);
  }
  stream.end();
}

function bestText(current, candidate) {
  return normalizeText(candidate).length > normalizeText(current).length ? candidate : current;
}

function bestDocument(current, candidate) {
  const normalizedCurrent = normalizeDocument(current);
  const normalizedCandidate = normalizeDocument(candidate);
  if (!normalizedCurrent || normalizedCurrent === "0") return normalizedCandidate;
  if (normalizedCandidate && normalizedCandidate !== "0" && normalizedCandidate.length > normalizedCurrent.length) {
    return normalizedCandidate;
  }
  return normalizedCurrent;
}

function pushMapArray(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function patientLabel(patient) {
  return `${patient.apellido}, ${patient.nombre} | doc ${patient.documento || "-"} | nac ${patient.fechaNacimiento || "-"} | fila ${patient.sourceIndex}`;
}
