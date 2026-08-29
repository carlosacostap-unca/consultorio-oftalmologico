import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  desktopUpdateKeyId,
  validateDesktopUpdatePublicKeys,
} from "../desktop/update-integrity.mjs";
import {
  DesktopStablePreflightVerificationError,
  verifyDesktopStablePreflight,
} from "./desktop_update_stable_preflight_verifier_core.mjs";

const MAX_METADATA_BYTES = 1024 * 1024;

try {
  await main();
} catch (error) {
  const known = error instanceof DesktopStablePreflightVerificationError;
  const code = known ? error.code : "verification_unavailable";
  const message = known ? error.message : "No se pudo completar la prevalidación segura.";
  console.error(`Prevalidación de promoción a stable: RECHAZADA (${code})`);
  console.error(message);
  console.error("No se imprimieron hashes, firmas, claves, URLs ni credenciales.");
  process.exitCode = 1;
}

async function main() {
  const config = loadConfig(process.env);
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const result = await verifyDesktopStablePreflight({
    readObject(key) {
      return readMetadataObject(client, config.bucket, key);
    },
    publicKeysById: config.publicKeys,
  });

  console.log("Prevalidación de promoción a stable: APROBADA");
  printChannel(result.stable);
  printChannel(result.pilot);
  console.log(`Candidata exacta para promoción: ${result.candidateVersion}`);
  console.log(`Destino: ${result.target}`);
  console.log("Pilot es estrictamente posterior a stable y ambos metadatos firmados son válidos.");
  console.log("No se descargaron instaladores ni se modificaron objetos o punteros de pilot o stable.");
  console.log("La promoción todavía requiere una autorización separada y explícita.");
}

function printChannel(channel) {
  console.log(`${channel.channel}: versión ${channel.version}, política ${channel.kind}, mínimo ${channel.minimumVersion}`);
  console.log(`${channel.channel}: ${channel.artifactCount} artefactos; instalador ${channel.installer}; firma Ed25519 aceptada`);
}

async function readMetadataObject(client, bucket, key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw storageObjectMissing();
  if (typeof response.ContentLength === "number" && response.ContentLength > MAX_METADATA_BYTES) {
    throw metadataTooLarge();
  }
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  if (bytes.byteLength > MAX_METADATA_BYTES) throw metadataTooLarge();
  return bytes;
}

function loadConfig(env) {
  const config = {
    endpoint: String(env.IDRIVE_E2_ENDPOINT || "").trim(),
    region: String(env.IDRIVE_E2_REGION || "").trim(),
    bucket: String(env.IDRIVE_E2_BUCKET || "").trim(),
    accessKeyId: String(env.IDRIVE_E2_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: String(env.IDRIVE_E2_SECRET_ACCESS_KEY || "").trim(),
  };
  let endpoint;
  try {
    endpoint = new URL(config.endpoint);
  } catch {
    throw new Error("Configuración incompleta");
  }
  if (
    !Object.values(config).every(Boolean)
    || endpoint.protocol !== "https:"
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash
    || endpoint.pathname !== "/"
  ) {
    throw new Error("Configuración incompleta");
  }
  return {
    ...config,
    endpoint: endpoint.origin,
    publicKeys: loadPublicKeys(env),
  };
}

function loadPublicKeys(env) {
  const keyring = String(env.DESKTOP_UPDATE_PUBLIC_KEYS || "").trim();
  if (keyring) return validateDesktopUpdatePublicKeys(JSON.parse(keyring));

  const singleKey = String(env.DESKTOP_UPDATE_PUBLIC_KEY || "").trim();
  if (!singleKey) throw new Error("Configuración incompleta");
  const publicKeyDer = Buffer.from(singleKey, "base64");
  return validateDesktopUpdatePublicKeys({
    [desktopUpdateKeyId(publicKeyDer)]: singleKey,
  });
}

function storageObjectMissing() {
  return new DesktopStablePreflightVerificationError(
    "storage_object_missing",
    "No se encontró un metadato requerido de pilot o stable.",
  );
}

function metadataTooLarge() {
  return new DesktopStablePreflightVerificationError(
    "metadata_too_large",
    "Un metadato de pilot o stable excede el tamaño permitido.",
  );
}
