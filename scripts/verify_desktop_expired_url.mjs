import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ExpiredDesktopUpdateUrlVerificationError,
  verifyExpiredDesktopUpdateUrl,
} from "./desktop_update_expired_url_verifier_core.mjs";

try {
  await main();
} catch (error) {
  const known = error instanceof ExpiredDesktopUpdateUrlVerificationError;
  const code = known ? error.code : "verification_unavailable";
  const message = known ? error.message : "No se pudo completar la verificación segura.";
  console.error(`Verificación segura de URL expirada: RECHAZADA (${code})`);
  console.error(message);
  console.error("No se imprimieron URLs prefirmadas ni credenciales.");
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
  const result = await verifyExpiredDesktopUpdateUrl({
    readTextObject(key) {
      return readTextObject(client, config.bucket, key);
    },
    presignGetObject(key, expiresIn) {
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn },
      );
    },
    requestRange,
  });

  console.log("Verificación segura de URL expirada: APROBADA");
  console.log(`Canal: ${result.channel}`);
  console.log(`Versión: ${result.version}`);
  console.log(`Artefacto: ${result.artifact}`);
  console.log(`URL expirada rechazada: HTTP ${result.expiredStatus}`);
  console.log(`URL nueva aceptada: HTTP ${result.freshStatus}`);
  console.log("No se modificaron objetos ni punteros del bucket.");
}

async function readTextObject(client, bucket, key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) {
    throw new ExpiredDesktopUpdateUrlVerificationError(
      "storage_object_missing",
      "No se encontró un metadato requerido del canal piloto.",
    );
  }
  if (typeof response.ContentLength === "number" && response.ContentLength > 1024 * 1024) {
    throw new ExpiredDesktopUpdateUrlVerificationError(
      "metadata_too_large",
      "Un metadato del canal piloto excede el tamaño permitido.",
    );
  }
  const text = await response.Body.transformToString("utf-8");
  if (Buffer.byteLength(text, "utf8") > 1024 * 1024) {
    throw new ExpiredDesktopUpdateUrlVerificationError(
      "metadata_too_large",
      "Un metadato del canal piloto excede el tamaño permitido.",
    );
  }
  return text;
}

async function requestRange(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Range: "bytes=0-0" },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  await response.body?.cancel();
  return { ok: response.ok, status: response.status };
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
  return { ...config, endpoint: endpoint.origin };
}
