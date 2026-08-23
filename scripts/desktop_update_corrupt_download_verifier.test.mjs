import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  canonicalJson,
  createSignatureEnvelope,
  desktopUpdateKeyId,
} from "../desktop/update-integrity.mjs";
import {
  CorruptDesktopDownloadVerificationError,
  verifyCorruptDesktopDownload,
} from "./desktop_update_corrupt_download_verifier_core.mjs";

test("rechaza por tamaño una copia temporal truncada del instalador auténtico", async () => {
  const release = createRelease(Buffer.alloc(80 * 1024, 7));
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "consultorio-corrupt-test-"));
  let verifiedPath;
  try {
    const result = await verifyCorruptDesktopDownload({
      ...harness(release, Buffer.alloc(64 * 1024, 7)),
      temporaryRoot,
      async verifyArtifactFile(manifest, artifactPath) {
        verifiedPath = artifactPath;
        const { verifyReleaseArtifactFile } = await import("../desktop/update-integrity.mjs");
        return verifyReleaseArtifactFile(manifest, artifactPath);
      },
    });

    assert.deepEqual(result, {
      channel: "pilot",
      version: "0.1.11",
      artifact: "Consultorio-Oftalmologico-0.1.11-x64.exe",
      sampledBytes: 64 * 1024,
      expectedBytes: 80 * 1024,
      mismatch: "size",
      corruptArtifactRejected: true,
    });
    await assert.rejects(access(verifiedPath));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("rechaza por SHA-512 una copia completa cuyo primer byte fue alterado", async () => {
  const artifactBytes = Buffer.from("instalador-sintético-completo");
  const release = createRelease(artifactBytes);
  const result = await verifyCorruptDesktopDownload(harness(release, artifactBytes));

  assert.equal(result.mismatch, "sha512");
  assert.equal(result.corruptArtifactRejected, true);
});

test("falla de forma cerrada si la firma auténtica no corresponde al manifiesto", async () => {
  const release = createRelease(Buffer.from("instalador"));
  await assert.rejects(
    verifyCorruptDesktopDownload({
      ...harness(release, Buffer.from("instalador")),
      verifySignature() { return false; },
    }),
    (error) => error instanceof CorruptDesktopDownloadVerificationError
      && error.code === "authentic_manifest_rejected",
  );
});

test("falla de forma cerrada si la barrera aceptara la copia corrupta", async () => {
  const release = createRelease(Buffer.from("instalador"));
  await assert.rejects(
    verifyCorruptDesktopDownload({
      ...harness(release, Buffer.from("instalador")),
      async verifyArtifactFile() { return true; },
    }),
    (error) => error instanceof CorruptDesktopDownloadVerificationError
      && error.code === "corrupt_artifact_accepted",
  );
});

test("rechaza un manifiesto piloto sin instalador exe", async () => {
  const release = createRelease(Buffer.from("metadato"), "builder-debug.yml");
  await assert.rejects(
    verifyCorruptDesktopDownload(harness(release, Buffer.from("metadato"))),
    (error) => error instanceof CorruptDesktopDownloadVerificationError
      && error.code === "installer_not_found",
  );
});

function createRelease(artifactBytes, file = "Consultorio-Oftalmologico-0.1.11-x64.exe") {
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
      file,
      key: `releases/0.1.11/${file}`,
      size: artifactBytes.byteLength,
      sha512: createHash("sha512").update(artifactBytes).digest("base64"),
    }],
  });
  const signature = canonicalJson(createSignatureEnvelope(
    Buffer.from(manifest),
    privateKeyDer.toString("base64"),
    keyId,
  ));
  return {
    artifactKey: `releases/0.1.11/${file}`,
    publicKeys: { [keyId]: publicKeyDer.toString("base64") },
    objects: {
      "channels/pilot/current.json": canonicalJson({ schemaVersion: 1, version: "0.1.11" }),
      "releases/0.1.11/release-manifest.json": manifest,
      "releases/0.1.11/release-manifest.sig": signature,
    },
  };
}

function harness(release, sample) {
  return {
    async readObject(key) { return release.objects[key]; },
    async readArtifactRange(key, requestedBytes) {
      assert.equal(key, release.artifactKey);
      return sample.subarray(0, requestedBytes);
    },
    publicKeysById: release.publicKeys,
  };
}
