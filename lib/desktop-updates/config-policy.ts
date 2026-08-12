export const DESKTOP_UPDATE_SERVER_ENV_NAMES = [
  "DESKTOP_UPDATES_ENABLED",
  "DESKTOP_UPDATE_FEED_URL",
  "DESKTOP_UPDATE_PUBLIC_KEY",
  "DESKTOP_UPDATE_PRESIGNED_TTL_SECONDS",
  "IDRIVE_E2_ENDPOINT",
  "IDRIVE_E2_REGION",
  "IDRIVE_E2_BUCKET",
  "IDRIVE_E2_ACCESS_KEY_ID",
  "IDRIVE_E2_SECRET_ACCESS_KEY",
] as const;

export type DesktopUpdateServerConfig =
  | { enabled: false }
  | {
      enabled: true;
      feedUrl: string;
      publicKey: string;
      presignedTtlSeconds: number;
      storage: {
        endpoint: string;
        region: string;
        bucket: string;
        accessKeyId: string;
        secretAccessKey: string;
      };
    };

export class DesktopUpdateConfigError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export function parseDesktopUpdateServerConfig(
  env: Record<string, string | undefined>,
): DesktopUpdateServerConfig {
  const enabledValue = String(env.DESKTOP_UPDATES_ENABLED || "false").trim().toLowerCase();
  if (enabledValue !== "true" && enabledValue !== "false") {
    throw new DesktopUpdateConfigError(
      "DESKTOP_UPDATES_ENABLED debe ser true o false",
      "invalid_enabled_flag",
    );
  }
  if (enabledValue === "false") return { enabled: false };

  const allowLocalHttp = env.NODE_ENV !== "production";
  const feedUrl = normalizedHttpsUrl(required(env, "DESKTOP_UPDATE_FEED_URL"), {
    name: "DESKTOP_UPDATE_FEED_URL",
    allowLocalHttp,
  });
  const endpoint = normalizedHttpsUrl(required(env, "IDRIVE_E2_ENDPOINT"), {
    name: "IDRIVE_E2_ENDPOINT",
    allowLocalHttp,
    originOnly: true,
  });
  const region = required(env, "IDRIVE_E2_REGION");
  const bucket = required(env, "IDRIVE_E2_BUCKET");
  const publicKey = required(env, "DESKTOP_UPDATE_PUBLIC_KEY");

  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || bucket.includes("..")) {
    throw new DesktopUpdateConfigError("IDRIVE_E2_BUCKET no es un nombre S3 válido", "invalid_bucket");
  }
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(region)) {
    throw new DesktopUpdateConfigError("IDRIVE_E2_REGION no es válida", "invalid_region");
  }
  if (!isBase64PublicKey(publicKey)) {
    throw new DesktopUpdateConfigError(
      "DESKTOP_UPDATE_PUBLIC_KEY debe contener una clave pública DER codificada en base64",
      "invalid_public_key",
    );
  }

  return {
    enabled: true,
    feedUrl,
    publicKey,
    presignedTtlSeconds: parseTtl(env.DESKTOP_UPDATE_PRESIGNED_TTL_SECONDS),
    storage: {
      endpoint,
      region,
      bucket,
      accessKeyId: required(env, "IDRIVE_E2_ACCESS_KEY_ID"),
      secretAccessKey: required(env, "IDRIVE_E2_SECRET_ACCESS_KEY"),
    },
  };
}

function required(env: Record<string, string | undefined>, name: string) {
  const value = String(env[name] || "").trim();
  if (!value) {
    throw new DesktopUpdateConfigError(`Falta la variable de servidor ${name}`, "missing_env");
  }
  return value;
}

function normalizedHttpsUrl(
  value: string,
  options: { name: string; allowLocalHttp: boolean; originOnly?: boolean },
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DesktopUpdateConfigError(`${options.name} no es una URL válida`, "invalid_url");
  }

  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(options.allowLocalHttp && local && url.protocol === "http:")) {
    throw new DesktopUpdateConfigError(`${options.name} debe usar HTTPS`, "https_required");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new DesktopUpdateConfigError(`${options.name} no puede incluir credenciales, query ni fragmento`, "unsafe_url");
  }
  if (options.originOnly && url.pathname !== "/") {
    throw new DesktopUpdateConfigError(`${options.name} debe contener sólo el origen`, "endpoint_must_be_origin");
  }

  return options.originOnly
    ? url.origin
    : url.toString().replace(/\/+$/, "");
}

function parseTtl(value: string | undefined) {
  const normalized = String(value || "900").trim();
  if (!/^\d+$/.test(normalized)) {
    throw new DesktopUpdateConfigError("El TTL prefirmado debe ser un entero", "invalid_presigned_ttl");
  }
  const ttl = Number(normalized);
  if (!Number.isSafeInteger(ttl) || ttl < 60 || ttl > 3600) {
    throw new DesktopUpdateConfigError(
      "El TTL prefirmado debe estar entre 60 y 3600 segundos",
      "invalid_presigned_ttl",
    );
  }
  return ttl;
}

function isBase64PublicKey(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return false;
  try {
    return Buffer.from(value, "base64").byteLength >= 32;
  } catch {
    return false;
  }
}
