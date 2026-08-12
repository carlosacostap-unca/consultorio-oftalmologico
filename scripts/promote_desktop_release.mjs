import { createHash } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  canonicalJson,
  parseDesktopReleaseManifestJson,
  verifySignatureEnvelope,
} from "../desktop/update-integrity.mjs";

const version = parseVersion(process.argv.slice(2));
const config = loadConfig(process.env);
const client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  forcePathStyle: true,
  credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
});

const manifestBytes = await readObject(`releases/${version}/release-manifest.json`);
const signatureBytes = await readObject(`releases/${version}/release-manifest.sig`);
const policyBytes = await readObject(`releases/${version}/release-policy.json`);
const manifest = parseDesktopReleaseManifestJson(manifestBytes.toString("utf8"));
if (manifest.version !== version) throw new Error("El manifiesto no coincide con la versión solicitada.");
if (!verifySignatureEnvelope(manifestBytes, signatureBytes.toString("utf8"), parsePublicKeys(config.publicKeys))) {
  throw new Error("La firma del release no es válida para el llavero de promoción.");
}
const policy = JSON.parse(policyBytes.toString("utf8"));
if (policy?.version !== version || policy?.platform !== "win32" || policy?.arch !== "x64") {
  throw new Error("La política no coincide con el release solicitado.");
}

for (const artifact of manifest.artifacts) {
  const bytes = await readObject(artifact.key);
  if (bytes.byteLength !== artifact.size || sha512Base64(bytes) !== artifact.sha512) {
    throw new Error(`El artefacto publicado no coincide con el manifiesto: ${artifact.file}`);
  }
}

const pointer = Buffer.from(canonicalJson({ schemaVersion: 1, version }));
await client.send(new PutObjectCommand({
  Bucket: config.bucket,
  Key: "channels/stable/current.json",
  Body: pointer,
  ContentType: "application/json",
  CacheControl: "private, no-store, max-age=0",
  Metadata: { sha512: createHash("sha512").update(pointer).digest("hex") },
}));
console.log(`Release ${version} promovido a stable sin recompilar.`);

async function readObject(key) {
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
    if (!response.Body) throw new Error("Objeto sin contenido.");
    return Buffer.from(await response.Body.transformToByteArray());
  } catch {
    throw new Error(`No se pudo verificar el objeto requerido: ${key}`);
  }
}

function parseVersion(args) {
  if (args.length !== 2 || args[0] !== "--version") throw new Error("Uso: --version <semver>");
  const value = args[1];
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(value)) {
    throw new Error("Versión SemVer inválida.");
  }
  return value;
}

function loadConfig(env) {
  const config = {
    endpoint: env.IDRIVE_E2_ENDPOINT || "",
    region: env.IDRIVE_E2_REGION || "",
    bucket: env.IDRIVE_E2_BUCKET || "",
    accessKeyId: env.IDRIVE_E2_ACCESS_KEY_ID || "",
    secretAccessKey: env.IDRIVE_E2_SECRET_ACCESS_KEY || "",
    publicKeys: env.DESKTOP_UPDATE_PUBLIC_KEYS || "",
  };
  if (!Object.values(config).every(Boolean) || !/^https:\/\//.test(config.endpoint)) {
    throw new Error("La configuración segura de promoción iDrive e2 está incompleta.");
  }
  return config;
}

function parsePublicKeys(value) {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).length < 1) {
    throw new Error("DESKTOP_UPDATE_PUBLIC_KEYS debe ser un objeto JSON no vacío.");
  }
  return parsed;
}

function sha512Base64(value) {
  return createHash("sha512").update(value).digest("base64");
}
