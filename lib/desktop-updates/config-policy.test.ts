import assert from "node:assert/strict";
import test from "node:test";
import {
  DESKTOP_UPDATE_SERVER_ENV_NAMES,
  DesktopUpdateConfigError,
  parseDesktopUpdateServerConfig,
} from "./config-policy.ts";

const validEnv = {
  NODE_ENV: "production",
  DESKTOP_UPDATES_ENABLED: "true",
  DESKTOP_UPDATE_FEED_URL: "https://consultorio.example/api/desktop-updates/v1/feed/",
  DESKTOP_UPDATE_PUBLIC_KEY: Buffer.alloc(44, 7).toString("base64"),
  DESKTOP_UPDATE_PRESIGNED_TTL_SECONDS: "600",
  IDRIVE_E2_ENDPOINT: "https://s3.example.idrivee2.com",
  IDRIVE_E2_REGION: "us-east-1",
  IDRIVE_E2_BUCKET: "consultorio-desktop-updates",
  IDRIVE_E2_ACCESS_KEY_ID: "read-only-key",
  IDRIVE_E2_SECRET_ACCESS_KEY: "server-secret",
};

test("la puerta deshabilitada no exige secretos", () => {
  assert.deepEqual(parseDesktopUpdateServerConfig({}), { enabled: false });
});

test("normaliza una configuración servidor válida", () => {
  assert.deepEqual(parseDesktopUpdateServerConfig(validEnv), {
    enabled: true,
    feedUrl: "https://consultorio.example/api/desktop-updates/v1/feed",
    publicKey: validEnv.DESKTOP_UPDATE_PUBLIC_KEY,
    presignedTtlSeconds: 600,
    storage: {
      endpoint: "https://s3.example.idrivee2.com",
      region: "us-east-1",
      bucket: "consultorio-desktop-updates",
      accessKeyId: "read-only-key",
      secretAccessKey: "server-secret",
    },
  });
});

test("ningún secreto de actualización usa NEXT_PUBLIC", () => {
  assert.equal(DESKTOP_UPDATE_SERVER_ENV_NAMES.some((name) => name.startsWith("NEXT_PUBLIC_")), false);
});

test("exige HTTPS en producción y permite loopback sólo fuera de producción", () => {
  assertConfigError(
    { ...validEnv, DESKTOP_UPDATE_FEED_URL: "http://consultorio.example/feed" },
    "https_required",
  );
  assert.equal(parseDesktopUpdateServerConfig({
    ...validEnv,
    NODE_ENV: "test",
    DESKTOP_UPDATE_FEED_URL: "http://127.0.0.1:3000/feed",
    IDRIVE_E2_ENDPOINT: "http://localhost:9000",
  }).enabled, true);
});

test("rechaza endpoint con ruta, bucket inválido y TTL fuera de rango", () => {
  assertConfigError({ ...validEnv, IDRIVE_E2_ENDPOINT: "https://s3.example/path" }, "endpoint_must_be_origin");
  assertConfigError({ ...validEnv, IDRIVE_E2_BUCKET: "UPDATES" }, "invalid_bucket");
  assertConfigError({ ...validEnv, DESKTOP_UPDATE_PRESIGNED_TTL_SECONDS: "30" }, "invalid_presigned_ttl");
});

test("rechaza variables requeridas y clave pública inválida", () => {
  assertConfigError({ ...validEnv, IDRIVE_E2_SECRET_ACCESS_KEY: "" }, "missing_env");
  assertConfigError({ ...validEnv, DESKTOP_UPDATE_PUBLIC_KEY: "no-es-base64" }, "invalid_public_key");
});

function assertConfigError(env: Record<string, string | undefined>, code: string) {
  assert.throws(
    () => parseDesktopUpdateServerConfig(env),
    (error: unknown) => error instanceof DesktopUpdateConfigError && error.code === code,
  );
}
