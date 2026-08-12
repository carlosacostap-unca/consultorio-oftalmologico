import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, validateDesktopUpdatePublicKeys } from "../desktop/update-integrity.mjs";

const raw = process.env.DESKTOP_UPDATE_PUBLIC_KEYS;
if (!raw) throw new Error("Falta DESKTOP_UPDATE_PUBLIC_KEYS para incorporar el llavero público al instalador.");
const keys = validateDesktopUpdatePublicKeys(JSON.parse(raw));
const output = path.resolve("desktop", "generated", "update-public-keys.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, canonicalJson(keys), { encoding: "utf8", flag: "w" });
console.log(`Llavero público Ed25519 preparado con ${Object.keys(keys).length} clave(s).`);
