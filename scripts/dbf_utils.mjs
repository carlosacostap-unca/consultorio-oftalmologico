import fs from "node:fs";
import iconv from "iconv-lite";

export function readDbf(path, options = {}) {
  const encoding = options.encoding || "cp850";
  if (!fs.existsSync(path)) {
    throw new Error(`No se encontro el DBF: ${path}`);
  }

  const buffer = fs.readFileSync(path);
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const lastUpdate = dbfLastUpdate(buffer);
  const fields = readDbfFields(buffer, headerLength);
  const fieldByName = new Map(fields.map((field) => [field.name, field]));

  function readRow(index) {
    if (index < 0 || index >= recordCount) {
      throw new Error(`Indice DBF fuera de rango: ${index}`);
    }

    const recordOffset = headerLength + index * recordLength;
    const deleted = buffer[recordOffset] === 0x2a;
    const row = {};

    for (const field of fields) {
      row[field.name] = readDbfValue(buffer, recordOffset, field, encoding);
    }

    return {
      __index: index + 1,
      __deleted: deleted,
      ...row,
    };
  }

  function rows({ includeDeleted = false } = {}) {
    const result = [];
    for (let index = 0; index < recordCount; index += 1) {
      const row = readRow(index);
      if (!includeDeleted && row.__deleted) continue;
      result.push(row);
    }
    return result;
  }

  return {
    path,
    recordCount,
    headerLength,
    recordLength,
    lastUpdate,
    fields,
    fieldByName,
    readRow,
    rows,
  };
}

export function normalizeFicha(value) {
  return normalizeNumericText(value);
}

export function normalizeCode(value) {
  return normalizeNumericText(value);
}

export function normalizeDocument(value) {
  return normalizeNumericText(value);
}

export function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function normalizeIdentityText(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function normalizeNameKey(value) {
  return normalizeIdentityText(value)
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function boolFromLegacy(value) {
  const normalized = normalizeText(value).toUpperCase();
  return normalized === "1" || normalized === "T" || normalized === "Y" || normalized === "S";
}

export function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (!/[",\r\n;]/.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export function writeJson(path, data) {
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function writeCsv(path, rows, columns) {
  const lines = [
    columns.map((column) => csvEscape(column.header || column.key)).join(";"),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column.key])).join(";")),
  ];
  fs.writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
}

function normalizeNumericText(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) return "";

  const numberValue = Number(trimmed);
  if (Number.isFinite(numberValue)) return String(Math.trunc(numberValue));

  return trimmed.toUpperCase();
}

function dbfLastUpdate(buffer) {
  const year = 1900 + buffer[1];
  const month = String(buffer[2]).padStart(2, "0");
  const day = String(buffer[3]).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readDbfFields(buffer, headerLength) {
  const fields = [];
  let offset = 32;
  let position = 1;

  while (offset < headerLength && buffer[offset] !== 0x0d) {
    const name = buffer.slice(offset, offset + 11).toString("ascii").replace(/\0.*$/, "").trim();
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    const decimals = buffer[offset + 17];

    fields.push({ name, type, length, decimals, position });
    position += length;
    offset += 32;
  }

  return fields;
}

function readDbfValue(buffer, recordOffset, field, encoding) {
  const start = recordOffset + field.position;
  const end = start + field.length;
  const raw = buffer.slice(start, end);

  if (field.type === "D") {
    return formatDbfDate(raw.toString("ascii").trim());
  }

  if (field.type === "L") {
    return raw.toString("ascii").trim().toUpperCase();
  }

  return iconv.decode(raw, encoding).trim();
}

function formatDbfDate(value) {
  if (!value) return "";
  if (!/^\d{8}$/.test(value)) return "";

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);

  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";

  return `${year}-${month}-${day}`;
}
