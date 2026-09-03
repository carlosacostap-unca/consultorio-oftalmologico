import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  desktopUpdateKeyId,
  validateDesktopUpdatePublicKeys,
} from "../desktop/update-integrity.mjs";
import {
  TamperedDesktopManifestVerificationError,
  verifyTamperedDesktopManifest,
} from "./desktop_update_tampered_manifest_verifier_core.mjs";

try {
  await main();
} catch (error) {
  const known = error instanceof TamperedDesktopManifestVerificationError;
  const code = known ? error.code : "verification_unavailable";
  const message = known ? error.message : "No se pudo completar la verificación segura.";
  console.error(`Verificación segura de manifiesto alterado: RECHAZADA (${code})`);
  console.error(message);
  console.error("No se imprimieron manifiestos, firmas, claves ni credenciales.");
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
  const result = await verifyTamperedDesktopManifest({
    readObject(key) {
      return readObject(client, config.bucket, key);
    },
    publicKeysById: config.publicKeys,
  });

  console.log("Verificación segura de manifiesto alterado: APROBADA");
  console.log(`Canal: ${result.channel}`);
  console.log(`Versión: ${result.version}`);
  console.log(`Artefacto: ${result.artifact}`);
  console.log("Manifiesto auténtico: firma Ed25519 aceptada");
  console.log("Copia alterada en memoria: firma Ed25519 rechazada");
  console.log("No se descargó ni invocó el instalador.");
  console.log("No se modificaron objetos ni punteros de pilot o stable.");
}

async function readObject(client, bucket, key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) {
    throw new TamperedDesktopManifestVerificationError(
      "storage_object_missing",
      "No se encontró un metadato requerido del canal piloto.",
    );
  }
  if (typeof response.ContentLength === "number" && response.ContentLength > 1024 * 1024) {
    throw metadataTooLarge();
  }
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  if (bytes.byteLength > 1024 * 1024) throw metadataTooLarge();
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

function metadataTooLarge() {
  return new TamperedDesktopManifestVerificationError(
    "metadata_too_large",
    "Un metadato del canal piloto excede el tamaño permitido.",
  );
}
