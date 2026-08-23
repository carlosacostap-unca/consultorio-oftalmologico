import assert from "node:assert/strict";
import test from "node:test";
import {
  ExpiredDesktopUpdateUrlVerificationError,
  verifyExpiredDesktopUpdateUrl,
} from "./desktop_update_expired_url_verifier_core.mjs";

const artifact = "Consultorio-Oftalmologico-0.1.11-x64.exe";
const objects = {
  "channels/pilot/current.json": JSON.stringify({ schemaVersion: 1, version: "0.1.11" }),
  "releases/0.1.11/release-manifest.json": JSON.stringify({
    schemaVersion: 1,
    version: "0.1.11",
    platform: "win32",
    arch: "x64",
    artifacts: [{
      file: artifact,
      key: `releases/0.1.11/${artifact}`,
      size: 171,
      sha512: Buffer.alloc(64, 7).toString("base64"),
    }],
  }),
};

test("rechaza la URL vencida y acepta una URL nueva sin exponerlas", async () => {
  const calls = [];
  const result = await verifyExpiredDesktopUpdateUrl({
    async readTextObject(key) {
      calls.push(`read:${key}`);
      return objects[key];
    },
    async presignGetObject(key, ttl) {
      calls.push(`sign:${key}:${ttl}`);
      return `https://storage.invalid/${ttl}/${calls.length}`;
    },
    async requestRange(url) {
      calls.push(url.includes("/1/") ? "request:expired" : "request:fresh");
      return url.includes("/1/") ? { ok: false, status: 403 } : { ok: true, status: 206 };
    },
    async sleep(milliseconds) {
      calls.push(`sleep:${milliseconds}`);
    },
  });

  assert.deepEqual(result, {
    channel: "pilot",
    version: "0.1.11",
    artifact,
    expiredStatus: 403,
    freshStatus: 206,
  });
  assert.deepEqual(calls, [
    "read:channels/pilot/current.json",
    "read:releases/0.1.11/release-manifest.json",
    `sign:releases/0.1.11/${artifact}:1`,
    "sleep:3000",
    "request:expired",
    `sign:releases/0.1.11/${artifact}:60`,
    "request:fresh",
  ]);
  assert.equal(Object.values(result).some((value) => String(value).includes("storage.invalid")), false);
});

test("falla de forma cerrada si el almacenamiento acepta la URL vencida", async () => {
  await assert.rejects(
    verifyExpiredDesktopUpdateUrl(harness({ expired: { ok: true, status: 206 } })),
    (error) => error instanceof ExpiredDesktopUpdateUrlVerificationError
      && error.code === "expired_url_accepted",
  );
});

test("falla de forma cerrada si la URL nueva no permite reintentar", async () => {
  await assert.rejects(
    verifyExpiredDesktopUpdateUrl(harness({ fresh: { ok: false, status: 403 } })),
    (error) => error instanceof ExpiredDesktopUpdateUrlVerificationError
      && error.code === "fresh_url_rejected",
  );
});

test("rechaza un artefacto fuera del release piloto", async () => {
  const unsafeObjects = {
    ...objects,
    "releases/0.1.11/release-manifest.json": JSON.stringify({
      schemaVersion: 1,
      version: "0.1.11",
      platform: "win32",
      arch: "x64",
      artifacts: [{
        file: artifact,
        key: "releases/otro/secreto.exe",
        size: 171,
        sha512: Buffer.alloc(64, 7).toString("base64"),
      }],
    }),
  };
  await assert.rejects(
    verifyExpiredDesktopUpdateUrl(harness({ objects: unsafeObjects })),
    (error) => error instanceof ExpiredDesktopUpdateUrlVerificationError
      && error.code === "invalid_release_metadata",
  );
});

function harness({
  expired = { ok: false, status: 403 },
  fresh = { ok: true, status: 206 },
  objects: source = objects,
} = {}) {
  let signed = 0;
  return {
    async readTextObject(key) { return source[key]; },
    async presignGetObject() {
      signed += 1;
      return `https://storage.invalid/${signed}`;
    },
    async requestRange(url) { return url.endsWith("/1") ? expired : fresh; },
    async sleep() {},
  };
}
