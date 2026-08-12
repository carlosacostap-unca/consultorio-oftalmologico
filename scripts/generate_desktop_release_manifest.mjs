import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, createDesktopReleaseManifest } from "../desktop/update-integrity.mjs";

const { version, output, artifacts } = parseArguments(process.argv.slice(2));
const manifest = await createDesktopReleaseManifest({ version, artifactPaths: artifacts });
const outputPath = path.resolve(output);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, canonicalJson(manifest), { encoding: "utf8", flag: "wx" });
console.log(`Manifiesto de release generado: ${outputPath}`);

function parseArguments(args) {
  let version = "";
  let output = "";
  const artifacts = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--version") version = args[++index] || "";
    else if (args[index] === "--output") output = args[++index] || "";
    else if (args[index] === "--artifact") artifacts.push(args[++index] || "");
    else throw new Error(`Argumento desconocido: ${args[index]}`);
  }
  if (!version || !output || artifacts.some((value) => !value)) {
    throw new Error("Uso: --version <semver> --output <archivo> --artifact <archivo> [--artifact <archivo>]");
  }
  return { version, output, artifacts };
}
