import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, createSignatureEnvelope, parseDesktopReleaseManifestJson } from "../desktop/update-integrity.mjs";

const { manifest, output } = parseArguments(process.argv.slice(2));
const privateKey = process.env.DESKTOP_UPDATE_PRIVATE_KEY;
if (!privateKey) throw new Error("Falta DESKTOP_UPDATE_PRIVATE_KEY en el entorno seguro de publicación.");

const manifestPath = path.resolve(manifest);
const manifestBytes = await readFile(manifestPath);
parseDesktopReleaseManifestJson(manifestBytes.toString("utf8"));
const envelope = createSignatureEnvelope(manifestBytes, privateKey, process.env.DESKTOP_UPDATE_KEY_ID);
const outputPath = path.resolve(output);
await writeFile(outputPath, canonicalJson(envelope), { encoding: "utf8", flag: "wx" });
console.log(`Firma Ed25519 generada: ${outputPath} (${envelope.keyId})`);

function parseArguments(args) {
  let manifest = "";
  let output = "";
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--manifest") manifest = args[++index] || "";
    else if (args[index] === "--output") output = args[++index] || "";
    else throw new Error(`Argumento desconocido: ${args[index]}`);
  }
  if (!manifest || !output) throw new Error("Uso: --manifest <archivo> --output <firma>");
  return { manifest, output };
}
