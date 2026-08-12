import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  canonicalJson,
  parseDesktopReleaseManifestJson,
  verifyReleaseArtifactHashes,
  verifySignatureEnvelope,
} from "../desktop/update-integrity.mjs";

const options = parseArguments(process.argv.slice(2));
const config = loadConfig(process.env);
const releaseDirectory = path.resolve(options.directory);
const manifestPath = insideDirectory(releaseDirectory, options.manifest);
const signaturePath = insideDirectory(releaseDirectory, options.signature);
const policyPath = insideDirectory(releaseDirectory, options.policy);
const [manifestBytes, signatureBytes, policyBytes] = await Promise.all([
  readFile(manifestPath), readFile(signaturePath), readFile(policyPath),
]);
const manifest = parseDesktopReleaseManifestJson(manifestBytes.toString("utf8"));
await verifyReleaseArtifactHashes(manifest, releaseDirectory);
const publicKeys = parsePublicKeys(config.publicKeys);
if (!verifySignatureEnvelope(manifestBytes, signatureBytes.toString("utf8"), publicKeys)) {
  throw new Error("La firma del manifiesto no es válida para el llavero de publicación.");
}
const policy = JSON.parse(policyBytes.toString("utf8"));
if (policy?.version !== manifest.version || policy?.platform !== "win32" || policy?.arch !== "x64") {
  throw new Error("La política no coincide con el manifiesto de release.");
}

const client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  forcePathStyle: true,
  credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
});

for (const artifact of manifest.artifacts) {
  await putImmutable(artifact.key, await readFile(insideDirectory(releaseDirectory, artifact.file)), contentType(artifact.file));
}
await putImmutable(`releases/${manifest.version}/release-manifest.json`, manifestBytes, "application/json");
await putImmutable(`releases/${manifest.version}/release-manifest.sig`, signatureBytes, "application/json");
await putImmutable(`releases/${manifest.version}/release-policy.json`, policyBytes, "application/json");

const pointer = Buffer.from(canonicalJson({ schemaVersion: 1, version: manifest.version }));
await client.send(new PutObjectCommand({
  Bucket: config.bucket,
  Key: `channels/${options.channel}/current.json`,
  Body: pointer,
  ContentType: "application/json",
  CacheControl: "private, no-store, max-age=0",
  Metadata: { sha512: sha512Hex(pointer) },
}));
console.log(`Release ${manifest.version} publicado atómicamente en el canal ${options.channel}.`);

async function putImmutable(key, body, type) {
  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: type,
      CacheControl: "private, max-age=31536000, immutable",
      IfNoneMatch: "*",
      Metadata: { sha512: sha512Hex(body) },
    }));
  } catch (error) {
    if (error?.name === "PreconditionFailed" || error?.$metadata?.httpStatusCode === 412) {
      throw new Error(`El objeto inmutable ya existe: ${key}`);
    }
    throw new Error(`No se pudo publicar el objeto inmutable: ${key}`);
  }
}

function parseArguments(args) {
  const result = { channel: "", directory: "", manifest: "", signature: "", policy: "" };
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    const value = args[++index] || "";
    if (option === "--channel") result.channel = value;
    else if (option === "--directory") result.directory = value;
    else if (option === "--manifest") result.manifest = value;
    else if (option === "--signature") result.signature = value;
    else if (option === "--policy") result.policy = value;
    else throw new Error(`Argumento desconocido: ${option}`);
  }
  if (!["pilot", "stable"].includes(result.channel) || !result.directory || !result.manifest || !result.signature || !result.policy) {
    throw new Error("Uso: --channel <pilot|stable> --directory <dir> --manifest <archivo> --signature <archivo> --policy <archivo>");
  }
  return result;
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
    throw new Error("La configuración segura de publicación iDrive e2 está incompleta.");
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

function insideDirectory(root, file) {
  const candidate = path.resolve(root, file);
  if (path.dirname(candidate) !== root) throw new Error("Archivo de publicación fuera del directorio permitido.");
  return candidate;
}

function sha512Hex(value) {
  return createHash("sha512").update(value).digest("hex");
}

function contentType(file) {
  if (file.endsWith(".yml")) return "application/yaml";
  if (file.endsWith(".exe")) return "application/vnd.microsoft.portable-executable";
  return "application/octet-stream";
}
