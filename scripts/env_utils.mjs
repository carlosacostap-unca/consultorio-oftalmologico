import fs from "node:fs";

const PRODUCTION_HOST_MARKERS = [
  "pocketbase-consultorio-oftalmologico.acostaparra.com",
];

export function envFileFromArgs(defaultPath = ".env.local") {
  const envIndex = process.argv.findIndex((arg) => arg === "--env");
  if (envIndex !== -1 && process.argv[envIndex + 1]) {
    return process.argv[envIndex + 1];
  }

  const inline = process.argv.find((arg) => arg.startsWith("--env="));
  if (inline) return inline.slice("--env=".length);

  return process.env.PLAYWRIGHT_ENV_FILE || process.env.ENV_FILE || defaultPath;
}

export function hasFlag(name) {
  return process.argv.includes(name);
}

export function loadEnvFile(path, { required = false } = {}) {
  if (!fs.existsSync(path)) {
    if (required) throw new Error(`No existe ${path}. Crea el archivo a partir de .env.test.local.example.`);
    return {};
  }

  const result = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function applyEnv(env) {
  for (const [key, value] of Object.entries(env)) {
    if (value && !process.env[key]) process.env[key] = value;
  }
}

export function pocketBaseUrl(env = process.env) {
  const url = env.POCKETBASE_URL || env.NEXT_PUBLIC_POCKETBASE_URL || "";
  return normalizePocketBaseUrl(url);
}

export function normalizePocketBaseUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

export function assertTestingPocketBaseUrl(url, { requireTest = false } = {}) {
  if (!requireTest) return;
  if (!url) throw new Error("POCKETBASE_URL o NEXT_PUBLIC_POCKETBASE_URL es requerido para testing.");

  const normalized = url.toLowerCase();
  const allowProduction = process.env.ALLOW_PRODUCTION_PB_FOR_TESTS === "true";
  if (allowProduction) return;

  const looksProduction = PRODUCTION_HOST_MARKERS.some((marker) => normalized.includes(marker));
  const looksTesting =
    normalized.includes("test") ||
    normalized.includes("testing") ||
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1");

  if (looksProduction || !looksTesting) {
    throw new Error(
      `PocketBase de testing invalido: ${url}. Usa una URL de testing o define ALLOW_PRODUCTION_PB_FOR_TESTS=true bajo tu responsabilidad.`
    );
  }
}
