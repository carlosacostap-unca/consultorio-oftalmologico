import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  canonicalJson,
  createDesktopReleaseManifest,
  createSignatureEnvelope,
  desktopUpdateKeyId,
  verifyReleaseArtifactHashes,
  verifyReleaseArtifactFile,
  verifySignatureEnvelope,
  validateDesktopUpdatePublicKeys,
} from "./update-integrity.mjs";

test("genera un manifiesto canónico ordenado con tamaño y SHA-512", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "desktop-release-"));
  const installer = path.join(directory, "Consultorio-1.2.3-x64.exe");
  const metadata = path.join(directory, "latest.yml");
  await writeFile(installer, "installer-bytes");
  await writeFile(metadata, "version: 1.2.3\n");

  const manifest = await createDesktopReleaseManifest({ version: "1.2.3", artifactPaths: [metadata, installer] });
  assert.deepEqual(manifest.artifacts.map(({ file }) => file), ["Consultorio-1.2.3-x64.exe", "latest.yml"]);
  assert.match(manifest.artifacts[0].sha512, /^[A-Za-z0-9+/]{86}==$/);
  assert.equal(canonicalJson({ z: 1, a: { y: 2, b: 3 } }), '{"a":{"b":3,"y":2},"z":1}\n');
  await verifyReleaseArtifactHashes(manifest, directory);
  assert.equal((await verifyReleaseArtifactFile(manifest, installer)).file, "Consultorio-1.2.3-x64.exe");
});

test("acepta una firma Ed25519 válida y rechaza un manifiesto alterado", () => {
  const key = createTestKey();
  const manifest = Buffer.from('{"version":"1.2.3"}\n');
  const envelope = createSignatureEnvelope(manifest, key.privateKey);
  assert.equal(verifySignatureEnvelope(manifest, envelope, { [key.keyId]: key.publicKey }), true);
  assert.equal(verifySignatureEnvelope(Buffer.from('{"version":"9.9.9"}\n'), envelope, { [key.keyId]: key.publicKey }), false);
});

test("rechaza un artefacto cuyo contenido no coincide con tamaño o hash", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "desktop-release-corrupt-"));
  const installer = path.join(directory, "Consultorio-1.2.3-x64.exe");
  await writeFile(installer, "original");
  const manifest = await createDesktopReleaseManifest({ version: "1.2.3", artifactPaths: [installer] });
  await writeFile(installer, "alterado");
  await assert.rejects(verifyReleaseArtifactHashes(manifest, directory), /Integridad inválida/);
});

test("permite solapamiento controlado de claves y rechaza una clave retirada", () => {
  const oldKey = createTestKey();
  const newKey = createTestKey();
  const manifest = Buffer.from('{"version":"2.0.0"}\n');
  const oldEnvelope = createSignatureEnvelope(manifest, oldKey.privateKey);
  const newEnvelope = createSignatureEnvelope(manifest, newKey.privateKey);
  const overlap = { [oldKey.keyId]: oldKey.publicKey, [newKey.keyId]: newKey.publicKey };

  assert.equal(verifySignatureEnvelope(manifest, oldEnvelope, overlap), true);
  assert.equal(verifySignatureEnvelope(manifest, newEnvelope, overlap), true);
  assert.equal(verifySignatureEnvelope(manifest, oldEnvelope, { [newKey.keyId]: newKey.publicKey }), false);
  assert.deepEqual(validateDesktopUpdatePublicKeys(overlap), overlap);
  assert.throws(() => validateDesktopUpdatePublicKeys({ incorrecta: oldKey.publicKey }));
});

function createTestKey() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateDer = privateKey.export({ type: "pkcs8", format: "der" });
  const publicDer = publicKey.export({ type: "spki", format: "der" });
  return {
    privateKey: privateDer.toString("base64"),
    publicKey: publicDer.toString("base64"),
    keyId: desktopUpdateKeyId(publicDer),
  };
}
