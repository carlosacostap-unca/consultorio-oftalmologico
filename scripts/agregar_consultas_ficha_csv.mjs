import fs from "node:fs";
import path from "node:path";
import { csvEscape, normalizeFicha, readDbf } from "./dbf_utils.mjs";

const csvPath = process.argv[2] || "reports/fichas-con-mas-de-un-paciente-2026-06-15.csv";
const dbfPath = process.argv[3] || "data/DATOMED.DBF";
const outputPath = process.argv[4] || csvPath;

const consultasDbf = readDbf(dbfPath);
const consultasPorFicha = new Map();

for (const row of consultasDbf.rows()) {
  const ficha = normalizeFicha(row.NUM_FICH);
  if (!ficha) continue;
  consultasPorFicha.set(ficha, (consultasPorFicha.get(ficha) || 0) + 1);
}

const csv = fs.readFileSync(csvPath, "utf8");
const rows = parseSemicolonCsv(csv);
if (rows.length === 0) throw new Error(`CSV vacio: ${csvPath}`);

const header = rows[0];
const fichaIndex = header.indexOf("ficha");
if (fichaIndex === -1) throw new Error("El CSV no tiene columna ficha.");

const columnName = "cantidad_consultas_ficha";
const existingColumnIndex = header.indexOf(columnName);
const outputHeader = existingColumnIndex === -1 ? [...header, columnName] : [...header];
const outputRows = [outputHeader];

for (const row of rows.slice(1)) {
  if (row.length === 1 && row[0] === "") continue;

  const ficha = normalizeFicha(row[fichaIndex]);
  const count = consultasPorFicha.get(ficha) || 0;
  const nextRow = [...row];

  while (nextRow.length < header.length) nextRow.push("");

  if (existingColumnIndex === -1) {
    nextRow.push(String(count));
  } else {
    nextRow[existingColumnIndex] = String(count);
  }

  outputRows.push(nextRow);
}

if (outputPath === csvPath) {
  const backupPath = backupName(csvPath);
  fs.copyFileSync(csvPath, backupPath);
  console.log(`Backup: ${backupPath}`);
}

fs.writeFileSync(
  outputPath,
  `${outputRows.map((row) => row.map(csvEscape).join(";")).join("\r\n")}\r\n`,
  "utf8"
);

const fichasCsv = new Set(outputRows.slice(1).map((row) => normalizeFicha(row[fichaIndex])).filter(Boolean));
const totalConsultasEnFichasCsv = [...fichasCsv].reduce((sum, ficha) => sum + (consultasPorFicha.get(ficha) || 0), 0);

console.log(`CSV: ${outputPath}`);
console.log(`Fichas en CSV: ${fichasCsv.size}`);
console.log(`Consultas DBF con ficha: ${[...consultasPorFicha.values()].reduce((sum, count) => sum + count, 0)}`);
console.log(`Consultas en fichas del CSV: ${totalConsultasEnFichasCsv}`);
console.log(`Columna: ${columnName}`);

function backupName(filePath) {
  const parsed = path.parse(filePath);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(parsed.dir, `${parsed.name}.backup-${stamp}${parsed.ext}`);
}

function parseSemicolonCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ";") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}
