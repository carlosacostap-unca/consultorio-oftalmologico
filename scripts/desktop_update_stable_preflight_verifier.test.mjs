import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  canonicalJson,
  createSignatureEnvelope,
  desktopUpdateKeyId,
} from "../desktop/update-integrity.mjs";
import {
  DesktopStablePreflightVerificationError,
  verifyDesktopStablePreflight,
} from "./desktop_update_stable_preflight_verifier_core.mjs";

test("aprueba metadatos firmados cuando pilot es posterior a stable y sólo lee objetos", async () => {
  const fixture = createFixture();
  const reads = [];
  const result = await verifyDesktopStablePreflight({
    async readObject(key) {
      reads.push(key);
      return fixture.objects[key];
    },
    publicKeysById: fixture.publicKeys,
  });

  assert.equal(result.candidateVersion, "0.1.11");
  assert.equal(result.stable.version, "0.1.10");
  assert.equal(result.pilot.version, "0.1.11");
  assert.equal(result.promotionEligible, true);
  assert.equal(reads.length, 8);
  assert.ok(reads.every((key) => key.startsWith("channels/") || key.startsWith("releases/")));
});

test("rechaza la prevalidación si pilot no es estrictamente posterior a stable", async () => {
  const fixture = createFixture({ pilotVersion: "0.1.10", stableVersion: "0.1.10" });
  await assert.rejects(
    verifyDesktopStablePreflight(harness(fixture)),
    (error) => error instanceof DesktopStablePreflightVerificationError
      && error.code === "pilot_not_newer",
  );
});

test("rechaza una firma inválida sin intentar promover", async () => {
  const fixture = createFixture();
  await assert.rejects(
    verifyDesktopStablePreflight({
      ...harness(fixture),
      verifySignature() { return false; },
    }),
    (error) => error instanceof DesktopStablePreflightVerificationError
      && error.code === "invalid_manifest_signature",
  );
});

test("rechaza una política que no coincide con la versión del puntero", async () => {
  const fixture = createFixture();
  fixture.objects["releases/0.1.11/release-policy.json"] = canonicalJson({
    version: "0.1.12",
    minimumVersion: "0.1.10",
    kind: "normal",
    platform: "win32",
    arch: "x64",
  });
  await assert.rejects(
    verifyDesktopStablePreflight(harness(fixture)),
    (error) => error instanceof DesktopStablePreflightVerificationError
      && error.code === "invalid_release_metadata",
  );
});

test("rechaza un release sin un único instalador exe", async () => {
  const fixture = createFixture({ pilotArtifact: "builder-debug.yml" });
  await assert.rejects(
    verifyDesktopStablePreflight(harness(fixture)),
    (error) => error instanceof DesktopStablePreflightVerificationError
      && error.code === "invalid_installer_count",
  );
});

function createFixture({
  pilotVersion = "0.1.11",
  stableVersion = "0.1.10",
  pilotArtifact = `Consultorio-Oftalmologico-${pilotVersion}-x64.exe`,
} = {}) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const privateKeyDer = privateKey.export({ type: "pkcs8", format: "der" });
  const keyId = desktopUpdateKeyId(publicKeyDer);
  const objects = {};

  addChannel({ channel: "pilot", version: pilotVersion, artifact: pilotArtifact });
  addChannel({
    channel: "stable",
    version: stableVersion,
    artifact: `Consultorio-Oftalmologico-${stableVersion}-x64.exe`,
  });

  return { objects, publicKeys: { [keyId]: publicKeyDer.toString("base64") } };

  function addChannel({ channel, version, artifact }) {
    const artifactBytes = Buffer.from(`${channel}-${version}-${artifact}`);
    const manifest = canonicalJson({
      schemaVersion: 1,
      version,
      platform: "win32",
      arch: "x64",
      artifacts: [{
        file: artifact,
        key: `releases/${version}/${artifact}`,
        size: artifactBytes.byteLength,
        sha512: createHash("sha512").update(artifactBytes).digest("base64"),
      }],
    });
    objects[`channels/${channel}/current.json`] = canonicalJson({ schemaVersion: 1, version });
    objects[`releases/${version}/release-manifest.json`] = manifest;
    objects[`releases/${version}/release-manifest.sig`] = canonicalJson(createSignatureEnvelope(
      Buffer.from(manifest),
      privateKeyDer.toString("base64"),
      keyId,
    ));
    objects[`releases/${version}/release-policy.json`] = canonicalJson({
      version,
      minimumVersion: stableVersion,
      kind: "normal",
      platform: "win32",
      arch: "x64",
    });
  }
}

function harness(fixture) {
  return {
    async readObject(key) { return fixture.objects[key]; },
    publicKeysById: fixture.publicKeys,
  };
}
