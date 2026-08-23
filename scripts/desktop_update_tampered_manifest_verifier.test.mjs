import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  canonicalJson,
  createSignatureEnvelope,
  desktopUpdateKeyId,
} from "../desktop/update-integrity.mjs";
import {
  TamperedDesktopManifestVerificationError,
  verifyTamperedDesktopManifest,
} from "./desktop_update_tampered_manifest_verifier_core.mjs";

const release = createRelease();

test("acepta el manifiesto piloto auténtico y rechaza sólo su copia alterada", async () => {
  const reads = [];
  const result = await verifyTamperedDesktopManifest({
    async readObject(key) {
      reads.push(key);
      return release.objects[key];
    },
    publicKeysById: release.publicKeys,
  });

  assert.deepEqual(result, {
    channel: "pilot",
    version: "0.1.11",
    artifact: "Consultorio-Oftalmologico-0.1.11-x64.exe",
    authenticManifestAccepted: true,
    alteredManifestRejected: true,
  });
  assert.deepEqual(reads.sort(), [
    "channels/pilot/current.json",
    "releases/0.1.11/release-manifest.json",
    "releases/0.1.11/release-manifest.sig",
  ]);
});

test("falla de forma cerrada si la firma auténtica no corresponde al manifiesto", async () => {
  const objects = { ...release.objects };
  const parsed = JSON.parse(objects["releases/0.1.11/release-manifest.json"]);
  parsed.artifacts[0].size += 1;
  objects["releases/0.1.11/release-manifest.json"] = canonicalJson(parsed);

  await assert.rejects(
    verifyTamperedDesktopManifest(harness(objects)),
    (error) => error instanceof TamperedDesktopManifestVerificationError
      && error.code === "authentic_manifest_rejected",
  );
});

test("falla de forma cerrada si un verificador aceptara la copia alterada", async () => {
  await assert.rejects(
    verifyTamperedDesktopManifest({
      ...harness(release.objects),
      verifySignature() { return true; },
    }),
    (error) => error instanceof TamperedDesktopManifestVerificationError
      && error.code === "tampered_manifest_accepted",
  );
});

test("rechaza punteros o metadatos fuera del contrato piloto", async () => {
  const objects = {
    ...release.objects,
    "channels/pilot/current.json": JSON.stringify({ schemaVersion: 1, version: "../stable" }),
  };
  await assert.rejects(
    verifyTamperedDesktopManifest(harness(objects)),
    (error) => error instanceof TamperedDesktopManifestVerificationError
      && error.code === "invalid_release_metadata",
  );
});

function createRelease() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const privateKeyDer = privateKey.export({ type: "pkcs8", format: "der" });
  const keyId = desktopUpdateKeyId(publicKeyDer);
  const manifest = canonicalJson({
    schemaVersion: 1,
    version: "0.1.11",
    platform: "win32",
    arch: "x64",
    artifacts: [{
      file: "Consultorio-Oftalmologico-0.1.11-x64.exe",
      key: "releases/0.1.11/Consultorio-Oftalmologico-0.1.11-x64.exe",
      size: 171,
      sha512: Buffer.alloc(64, 7).toString("base64"),
    }],
  });
  const signature = canonicalJson(createSignatureEnvelope(
    Buffer.from(manifest),
    privateKeyDer.toString("base64"),
    keyId,
  ));
  return {
    publicKeys: { [keyId]: publicKeyDer.toString("base64") },
    objects: {
      "channels/pilot/current.json": canonicalJson({ schemaVersion: 1, version: "0.1.11" }),
      "releases/0.1.11/release-manifest.json": manifest,
      "releases/0.1.11/release-manifest.sig": signature,
    },
  };
}

function harness(objects) {
  return {
    async readObject(key) { return objects[key]; },
    publicKeysById: release.publicKeys,
  };
}
