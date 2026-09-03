import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  desktopUpdateKeyId,
  validateDesktopUpdatePublicKeys,
} from "../desktop/update-integrity.mjs";
import {
  CorruptDesktopDownloadVerificationError,
  verifyCorruptDesktopDownload,
} from "./desktop_update_corrupt_download_verifier_core.mjs";

try {
  await main();
} catch (error) {
  const known = error instanceof CorruptDesktopDownloadVerificationError;
  const code = known ? error.code : "verification_unavailable";
  const message = known ? error.message : "No se pudo completar la verificación segura.";
  console.error(`Verificación segura de descarga corrupta: RECHAZADA (${code})`);
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
  const result = await verifyCorruptDesktopDownload({
    readObject(key) {
      return readMetadataObject(client, config.bucket, key);
    },
    readArtifactRange(key, requestedBytes) {
      return readArtifactRange(client, config.bucket, key, requestedBytes);
    },
    publicKeysById: config.publicKeys,
  });

  console.log("Verificación segura de descarga corrupta: APROBADA");
  console.log(`Canal: ${result.channel}`);
  console.log(`Versión: ${result.version}`);
  console.log(`Artefacto: ${result.artifact}`);
  console.log(`Muestra local temporal: ${result.sampledBytes} bytes de ${result.expectedBytes}`);
  console.log(`Copia corrupta rechazada por: ${result.mismatch === "size" ? "tamaño" : "SHA-512"}`);
  console.log("La copia corrupta no quedó marcada como lista y fue eliminada.");
  console.log("No se descargó el instalador completo ni se invocó el instalador.");
  console.log("No se modificaron objetos ni punteros de pilot o stable.");
}

async function readMetadataObject(client, bucket, key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw storageObjectMissing();
  if (typeof response.ContentLength === "number" && response.ContentLength > 1024 * 1024) {
    throw metadataTooLarge();
  }
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  if (bytes.byteLength > 1024 * 1024) throw metadataTooLarge();
  return bytes;
}

async function readArtifactRange(client, bucket, key, requestedBytes) {
  const response = await client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    Range: `bytes=0-${requestedBytes - 1}`,
  }));
  if (!response.Body) throw storageObjectMissing();
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  if (bytes.byteLength < 1 || bytes.byteLength > requestedBytes) {
    throw new CorruptDesktopDownloadVerificationError(
      "invalid_artifact_sample",
      "La muestra acotada del instalador no es válida.",
    );
  }
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
  return new CorruptDesktopDownloadVerificationError(
    "storage_object_missing",
    "No se encontró un objeto requerido del canal piloto.",
  );
}

function metadataTooLarge() {
  return new CorruptDesktopDownloadVerificationError(
    "metadata_too_large",
    "Un metadato del canal piloto excede el tamaño permitido.",
  );
}
