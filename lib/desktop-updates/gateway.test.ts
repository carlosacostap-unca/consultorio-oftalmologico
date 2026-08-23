import assert from "node:assert/strict";
import test from "node:test";
import { desktopUpdateFeedResponse } from "./gateway.ts";
import { parseDesktopReleaseManifest, releaseMetadataKey, safeDesktopUpdateFile } from "./release-manifest.ts";
import { parseDesktopUpdateReport } from "./report-policy.ts";
import { DesktopUpdateStorageError, type DesktopUpdateObjectStorage } from "./storage-contract.ts";

const artifactFile = "Consultorio-Oftalmologico-0.2.0-x64.exe";
const manifest = JSON.stringify({
  schemaVersion: 1,
  version: "0.2.0",
  platform: "win32",
  arch: "x64",
  artifacts: [{
    file: artifactFile,
    key: `releases/0.2.0/${artifactFile}`,
    size: 123,
    sha512: Buffer.alloc(64, 5).toString("base64"),
  }],
});

test("sirve latest.yml desde el canal autoritativo sin cache", async () => {
  const calls: string[] = [];
  const response = await desktopUpdateFeedResponse({
    channel: "pilot",
    file: "latest.yml",
    endpoint: "https://s3.example.idrivee2.com",
    presignedTtlSeconds: 600,
    storage: storageMock(calls, {
      "channels/pilot/current.json": '{"schemaVersion":1,"version":"0.2.0"}',
      "releases/0.2.0/latest.yml": "version: 0.2.0",
    }),
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "version: 0.2.0");
  assert.deepEqual(calls, ["read:channels/pilot/current.json", "read:releases/0.2.0/latest.yml"]);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
});

test("redirecciona sólo un artefacto incluido en el manifiesto del canal", async () => {
  const calls: string[] = [];
  const response = await desktopUpdateFeedResponse({
    channel: "stable",
    file: artifactFile,
    endpoint: "https://s3.example.idrivee2.com",
    presignedTtlSeconds: 900,
    storage: storageMock(calls, channelObjects({ "releases/0.2.0/release-manifest.json": manifest })),
  });
  assert.equal(response.status, 302);
  assert.match(response.headers.get("location") || "", /^https:\/\/s3\.example\.idrivee2\.com\//);
  assert.deepEqual(calls, [
    "read:channels/stable/current.json",
    "read:releases/0.2.0/release-manifest.json",
    `sign:releases/0.2.0/${artifactFile}:900`,
  ]);
});

test("genera una URL prefirmada nueva al reintentar una descarga expirada", async () => {
  let attempt = 0;
  const objects: Record<string, string> = channelObjects({
    "releases/0.2.0/release-manifest.json": manifest,
  });
  const storage: DesktopUpdateObjectStorage = {
    async readTextObject(key) {
      const value = objects[key];
      if (value === undefined) throw new DesktopUpdateStorageError("not_found");
      return value;
    },
    async presignGetObject(key, expiresIn) {
      attempt += 1;
      return `https://s3.example.idrivee2.com/bucket/${encodeURIComponent(key)}?X-Amz-Signature=attempt-${attempt}&X-Amz-Expires=${expiresIn}`;
    },
  };

  const first = await desktopUpdateFeedResponse({
    channel: "stable", file: artifactFile, endpoint: "https://s3.example.idrivee2.com", presignedTtlSeconds: 60, storage,
  });
  const retry = await desktopUpdateFeedResponse({
    channel: "stable", file: artifactFile, endpoint: "https://s3.example.idrivee2.com", presignedTtlSeconds: 60, storage,
  });

  assert.equal(first.status, 302);
  assert.equal(retry.status, 302);
  assert.notEqual(first.headers.get("location"), retry.headers.get("location"));
  assert.match(first.headers.get("location") || "", /X-Amz-Signature=attempt-1/);
  assert.match(retry.headers.get("location") || "", /X-Amz-Signature=attempt-2/);
});

test("rechaza traversal, objeto ajeno al manifiesto y redirección a otro origen", async () => {
  assert.throws(() => safeDesktopUpdateFile("../secret"));
  assert.throws(() => releaseMetadataKey("0.2.0", "other.yml"));

  const missing = await desktopUpdateFeedResponse({
    channel: "stable", file: "otro.exe", endpoint: "https://s3.example.idrivee2.com", presignedTtlSeconds: 600,
    storage: storageMock([], channelObjects({ "releases/0.2.0/release-manifest.json": manifest })),
  });
  assert.equal(missing.status, 404);

  const foreign = await desktopUpdateFeedResponse({
    channel: "stable", file: artifactFile, endpoint: "https://s3.example.idrivee2.com", presignedTtlSeconds: 600,
    storage: storageMock([], channelObjects({ "releases/0.2.0/release-manifest.json": manifest }), "https://evil.example/file?X-Amz-Signature=x"),
  });
  assert.equal(foreign.status, 400);
});

test("mapea objeto inexistente y falla S3 sin filtrar el error original", async () => {
  const notFound = await desktopUpdateFeedResponse({
    channel: "stable", file: "latest.yml", endpoint: "https://s3.example.idrivee2.com", presignedTtlSeconds: 600,
    storage: failingStorage("not_found"),
  });
  assert.equal(notFound.status, 404);
  assert.equal((await notFound.json()).code, "storage_not_found");

  const unavailable = await desktopUpdateFeedResponse({
    channel: "stable", file: "latest.yml", endpoint: "https://s3.example.idrivee2.com", presignedTtlSeconds: 600,
    storage: failingStorage("unavailable"),
  });
  assert.equal(unavailable.status, 502);
  assert.doesNotMatch(await unavailable.text(), /access|secret|stack/i);
});

test("valida claves, hashes y reportes con allowlist", () => {
  assert.equal(parseDesktopReleaseManifest(JSON.parse(manifest)).artifacts[0].file, artifactFile);
  assert.throws(() => parseDesktopReleaseManifest({
    ...JSON.parse(manifest), artifacts: [{ ...JSON.parse(manifest).artifacts[0], key: "other/file.exe" }],
  }));
  assert.deepEqual(parseDesktopUpdateReport({
    status: "installed", installedVersion: "0.2.0", updateVersion: "0.2.0", code: "ok",
  }), { status: "installed", installedVersion: "0.2.0", updateVersion: "0.2.0", code: "ok" });
  assert.throws(() => parseDesktopUpdateReport({ status: "installed", installedVersion: "latest", code: "token=secret" }));
});

function storageMock(calls: string[], objects: Record<string, string>, signedUrl?: string): DesktopUpdateObjectStorage {
  return {
    async readTextObject(key) {
      calls.push(`read:${key}`);
      const value = objects[key];
      if (value === undefined) throw new DesktopUpdateStorageError("not_found");
      return value;
    },
    async presignGetObject(key, expiresIn) {
      calls.push(`sign:${key}:${expiresIn}`);
      return signedUrl || `https://s3.example.idrivee2.com/bucket/${encodeURIComponent(key)}?X-Amz-Signature=test`;
    },
  };
}

function channelObjects(objects: Record<string, string>) {
  return { "channels/stable/current.json": '{"schemaVersion":1,"version":"0.2.0"}', ...objects };
}

function failingStorage(code: "not_found" | "unavailable"): DesktopUpdateObjectStorage {
  return {
    async readTextObject() { throw new DesktopUpdateStorageError(code); },
    async presignGetObject() { throw new DesktopUpdateStorageError(code); },
  };
}
