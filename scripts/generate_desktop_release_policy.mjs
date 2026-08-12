import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "../desktop/update-integrity.mjs";

const options = parseArguments(process.argv.slice(2));
const policy = {
  version: strictSemVer(options.version, "version"),
  minimumVersion: strictSemVer(options.minimumVersion, "minimum-version"),
  kind: options.kind,
  ...(options.effectiveAt ? { effectiveAt: validIsoDate(options.effectiveAt) } : {}),
  platform: "win32",
  arch: "x64",
};
const outputPath = path.resolve(options.output);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, canonicalJson(policy), { encoding: "utf8", flag: "wx" });
console.log(`Política de release generada: ${outputPath}`);

function parseArguments(args) {
  const result = { version: "", minimumVersion: "", kind: "normal", effectiveAt: "", output: "" };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[++index] || "";
    if (args[index - 1] === "--version") result.version = value;
    else if (args[index - 1] === "--minimum-version") result.minimumVersion = value;
    else if (args[index - 1] === "--kind") result.kind = value;
    else if (args[index - 1] === "--effective-at") result.effectiveAt = value;
    else if (args[index - 1] === "--output") result.output = value;
    else throw new Error(`Argumento desconocido: ${args[index - 1]}`);
  }
  if (!result.version || !result.minimumVersion || !result.output || !["normal", "mandatory"].includes(result.kind)) {
    throw new Error("Uso: --version <semver> --minimum-version <semver> --kind <normal|mandatory> --output <archivo>");
  }
  return result;
}

function strictSemVer(value, name) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(value)) {
    throw new Error(`${name} debe ser SemVer estricto.`);
  }
  return value;
}

function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error("effective-at debe ser una fecha UTC ISO válida.");
  }
  return value;
}
