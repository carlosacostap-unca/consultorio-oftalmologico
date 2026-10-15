import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

// El ensayo empaquetado nunca debe abrir el perfil de una instalación clínica.
export function prepareSmokeTestProfile(argv, normalProfile) {
  if (!argv.includes("--smoke-test")) return null;
  const candidates = argv.filter((value) => value.startsWith("--smoke-test-profile="));
  const requested = candidates[0]?.slice("--smoke-test-profile=".length) || "";
  if (candidates.length !== 1 || !path.isAbsolute(requested)) {
    throw new Error("El smoke test requiere --smoke-test-profile con una ruta absoluta nueva.");
  }
  const destination = path.join(realpathSync(path.dirname(requested)), path.basename(requested));
  const normalizedDestination = path.resolve(destination).toLowerCase();
  const canonicalNormal = existsSync(normalProfile) ? realpathSync(normalProfile)
    : path.join(realpathSync(path.dirname(normalProfile)), path.basename(normalProfile));
  const normalizedNormal = path.resolve(canonicalNormal).toLowerCase();
  if (normalizedDestination === normalizedNormal
    || normalizedDestination.startsWith(normalizedNormal + path.sep)
    || normalizedNormal.startsWith(normalizedDestination + path.sep)) {
    throw new Error("El perfil del smoke test debe estar separado del perfil habitual.");
  }
  // mkdir sin recursive rechaza atómicamente carpetas, archivos y enlaces ya existentes.
  mkdirSync(destination);
  writeFileSync(path.join(destination, "smoke-test-profile.json"), JSON.stringify({ syntheticOnly: true, createdAt: new Date().toISOString() }), { flag: "wx" });
  return destination;
}
