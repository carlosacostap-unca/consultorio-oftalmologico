import fs from "node:fs";
import path from "node:path";

export interface DatomedConsultaPayload {
  numero_ficha: string;
  fecha: string;
  motivo_consulta: string;
  av_sc_od: string;
  av_sc_oi: string;
  av_cc_od: string;
  av_cc_oi: string;
  ref_lejos_od_esf: string;
  ref_lejos_od_cil: string;
  ref_lejos_od_eje: string;
  ref_lejos_oi_esf: string;
  ref_lejos_oi_cil: string;
  ref_lejos_oi_eje: string;
  ref_cerca_od_esf: string;
  ref_cerca_od_cil: string;
  ref_cerca_od_eje: string;
  ref_cerca_oi_esf: string;
  ref_cerca_oi_cil: string;
  ref_cerca_oi_eje: string;
  pio_od: string;
  pio_oi: string;
  fondo_ojo: string;
  tratamiento: string;
  diagnostico: string;
  estado: "finalizada";
}

interface DbfField {
  name: string;
  length: number;
  position: number;
}

export function loadDatomedConsultasByFicha(ficha: string, dbfPath = path.join(process.cwd(), "data", "DATOMED.DBF")) {
  const normalizedFicha = normalizeFicha(ficha);
  if (!normalizedFicha) return [];
  if (!fs.existsSync(dbfPath)) {
    throw new Error(`No se encontro el DBF: ${dbfPath}`);
  }

  const buffer = fs.readFileSync(dbfPath);
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields = readDbfFields(buffer, headerLength);
  const fieldByName = new Map(fields.map((field) => [field.name, field]));
  const required = (name: string) => requiredField(fieldByName, name);
  const result: Array<{ sourceIndex: number; payload: DatomedConsultaPayload }> = [];

  for (let index = 0; index < recordCount; index += 1) {
    const recordOffset = headerLength + index * recordLength;
    if (buffer[recordOffset] === 0x2a) continue;

    const rowFicha = normalizeFicha(readDbfField(buffer, recordOffset, required("NUM_FICH")));
    if (rowFicha !== normalizedFicha) continue;

    result.push({
      sourceIndex: index + 1,
      payload: {
        numero_ficha: rowFicha,
        fecha: parseDbfDate(readDbfField(buffer, recordOffset, required("MED_FEC"))),
        motivo_consulta: cleanDbfValue(readDbfField(buffer, recordOffset, required("MOT_CONS"))),
        av_sc_od: cleanDbfValue(readDbfField(buffer, recordOffset, required("AG_VI_SCD"))),
        av_sc_oi: cleanDbfValue(readDbfField(buffer, recordOffset, required("AG_VI_SCI"))),
        av_cc_od: cleanDbfValue(readDbfField(buffer, recordOffset, required("AG_VI_CCD"))),
        av_cc_oi: cleanDbfValue(readDbfField(buffer, recordOffset, required("AG_VI_CCI"))),
        ref_lejos_od_esf: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_ESF_D"))),
        ref_lejos_od_cil: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_CIL_D"))),
        ref_lejos_od_eje: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_GRA_D"))),
        ref_lejos_oi_esf: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_ESF_I"))),
        ref_lejos_oi_cil: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_CIL_I"))),
        ref_lejos_oi_eje: cleanDbfValue(readDbfField(buffer, recordOffset, required("LEJ_GRA_I"))),
        ref_cerca_od_esf: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_ESF_D"))),
        ref_cerca_od_cil: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_CIL_D"))),
        ref_cerca_od_eje: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_GRA_D"))),
        ref_cerca_oi_esf: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_ESF_I"))),
        ref_cerca_oi_cil: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_CIL_I"))),
        ref_cerca_oi_eje: cleanDbfValue(readDbfField(buffer, recordOffset, required("CER_GRA_I"))),
        pio_od: cleanDbfValue(readDbfField(buffer, recordOffset, required("PRE_OCU_D"))),
        pio_oi: cleanDbfValue(readDbfField(buffer, recordOffset, required("PRE_OCU_I"))),
        fondo_ojo: cleanDbfValue(readDbfField(buffer, recordOffset, required("FONDO_OJO"))),
        tratamiento: cleanDbfValue(readDbfField(buffer, recordOffset, required("TRATA"))),
        diagnostico: cleanDbfValue(readDbfField(buffer, recordOffset, required("MED_DIAG"))),
        estado: "finalizada",
      },
    });
  }

  return result.sort((a, b) => a.payload.fecha.localeCompare(b.payload.fecha) || a.sourceIndex - b.sourceIndex);
}

export function normalizeFicha(value: unknown) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const numeric = Number(trimmed.replace(",", "."));
  if (Number.isFinite(numeric)) return String(Math.trunc(numeric));
  return trimmed.toUpperCase();
}

function readDbfFields(buffer: Buffer, headerLength: number) {
  const fields: DbfField[] = [];
  let offset = 32;
  let position = 1;

  while (offset < headerLength && buffer[offset] !== 0x0d) {
    const name = buffer.subarray(offset, offset + 11).toString("ascii").replace(/\0.*$/, "").trim();
    const length = buffer[offset + 16];
    fields.push({ name, length, position });
    position += length;
    offset += 32;
  }

  return fields;
}

function readDbfField(buffer: Buffer, recordOffset: number, field: DbfField) {
  const start = recordOffset + field.position;
  const end = start + field.length;
  return buffer.subarray(start, end).toString("latin1");
}

function requiredField(fieldByName: Map<string, DbfField>, name: string) {
  const field = fieldByName.get(name);
  if (!field) throw new Error(`El DBF no contiene el campo ${name}.`);
  return field;
}

function cleanDbfValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseDbfDate(value: string) {
  const cleaned = value.trim();
  if (!/^\d{8}$/.test(cleaned)) return "";

  const year = cleaned.slice(0, 4);
  const month = cleaned.slice(4, 6);
  const day = cleaned.slice(6, 8);
  return `${year}-${month}-${day} 12:00:00.000Z`;
}
