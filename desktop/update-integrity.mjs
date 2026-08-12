import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SHA512_PATTERN = /^[A-Za-z0-9+/]{86}==$/;
const KEY_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{7,63}$/;

export async function createDesktopReleaseManifest({ version, artifactPaths }) {
  assertStrictSemVer(version);
  if (!Array.isArray(artifactPaths) || artifactPaths.length === 0) {
    throw new Error("Debe indicar al menos un artefacto de release.");
  }

  const artifacts = [];
  for (const artifactPath of artifactPaths) {
    const absolutePath = path.resolve(String(artifactPath));
    const file = safeArtifactFile(path.basename(absolutePath));
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile() || fileStat.size < 1) {
      throw new Error(`El artefacto ${file} no es un archivo regular no vacío.`);
    }
    const contents = await readFile(absolutePath);
    artifacts.push({
      file,
      key: `releases/${version}/${file}`,
      size: contents.byteLength,
      sha512: sha512Base64(contents),
    });
  }

  artifacts.sort((left, right) => left.file.localeCompare(right.file, "en"));
  if (new Set(artifacts.map((artifact) => artifact.file)).size !== artifacts.length) {
    throw new Error("El release contiene nombres de artefacto duplicados.");
  }

  return {
    schemaVersion: 1,
    version,
    platform: "win32",
    arch: "x64",
    artifacts,
  };
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

export function parseDesktopReleaseManifestJson(text) {
  const value = JSON.parse(String(text));
  if (!isRecord(value) || value.schemaVersion !== 1) throw new Error("Esquema de manifiesto inválido.");
  assertStrictSemVer(value.version);
  if (value.platform !== "win32" || value.arch !== "x64" || !Array.isArray(value.artifacts) || value.artifacts.length === 0) {
    throw new Error("Destino o artefactos de manifiesto inválidos.");
  }
  for (const artifact of value.artifacts) validateArtifact(artifact, value.version);
  return value;
}

export function createSignatureEnvelope(manifestBytes, privateKeyBase64, requestedKeyId) {
  const privateKey = importPrivateKey(privateKeyBase64);
  const publicKey = createPublicKey(privateKey);
  const keyId = requestedKeyId || desktopUpdateKeyId(publicKey.export({ type: "spki", format: "der" }));
  if (!KEY_ID_PATTERN.test(keyId)) throw new Error("Identificador de clave de firma inválido.");
  return {
    schemaVersion: 1,
    algorithm: "Ed25519",
    keyId,
    signature: sign(null, asBuffer(manifestBytes), privateKey).toString("base64"),
  };
}

export function verifySignatureEnvelope(manifestBytes, envelopeValue, publicKeysById) {
  const envelope = parseSignatureEnvelope(envelopeValue);
  const publicKeyBase64 = publicKeysById?.[envelope.keyId];
  if (!publicKeyBase64) return false;
  try {
    const publicKey = createPublicKey({ key: decodeDer(publicKeyBase64, "clave pública"), type: "spki", format: "der" });
    if (publicKey.asymmetricKeyType !== "ed25519") return false;
    return verify(null, asBuffer(manifestBytes), publicKey, Buffer.from(envelope.signature, "base64"));
  } catch {
    return false;
  }
}

export async function verifyReleaseArtifactHashes(manifestValue, artifactDirectory) {
  const manifest = parseDesktopReleaseManifestJson(JSON.stringify(manifestValue));
  const root = path.resolve(artifactDirectory);
  for (const artifact of manifest.artifacts) {
    const artifactPath = path.resolve(root, artifact.file);
    if (path.dirname(artifactPath) !== root) throw new Error("Ruta de artefacto fuera del directorio de release.");
    const contents = await readFile(artifactPath);
    if (contents.byteLength !== artifact.size || sha512Base64(contents) !== artifact.sha512) {
      throw new Error(`Integridad inválida para ${artifact.file}.`);
    }
  }
  return true;
}

export async function verifyReleaseArtifactFile(manifestValue, artifactPath) {
  const manifest = parseDesktopReleaseManifestJson(JSON.stringify(manifestValue));
  const absolutePath = path.resolve(artifactPath);
  const file = path.basename(absolutePath);
  const artifact = manifest.artifacts.find((candidate) => candidate.file === file);
  if (!artifact) throw new Error("El instalador descargado no pertenece al manifiesto firmado.");
  const contents = await readFile(absolutePath);
  if (contents.byteLength !== artifact.size || sha512Base64(contents) !== artifact.sha512) {
    throw new Error(`Integridad inválida para ${artifact.file}.`);
  }
  return artifact;
}

export function validateDesktopUpdatePublicKeys(value) {
  if (!isRecord(value) || Object.keys(value).length < 1) throw new Error("El llavero público no puede estar vacío.");
  const result = {};
  for (const [keyId, encodedKey] of Object.entries(value)) {
    if (!KEY_ID_PATTERN.test(keyId) || typeof encodedKey !== "string") throw new Error("Entrada de llavero público inválida.");
    const publicKey = createPublicKey({ key: decodeDer(encodedKey, "clave pública"), type: "spki", format: "der" });
    if (publicKey.asymmetricKeyType !== "ed25519") throw new Error("El llavero contiene una clave que no es Ed25519.");
    if (desktopUpdateKeyId(publicKey.export({ type: "spki", format: "der" })) !== keyId) {
      throw new Error("El identificador no coincide con la huella de la clave pública.");
    }
    result[keyId] = encodedKey;
  }
  return result;
}

export function desktopUpdateKeyId(publicKeyDer) {
  return `ed25519-${createHash("sha256").update(asBuffer(publicKeyDer)).digest("hex").slice(0, 16)}`;
}

function parseSignatureEnvelope(value) {
  const envelope = typeof value === "string" ? JSON.parse(value) : value;
  if (
    !isRecord(envelope)
    || envelope.schemaVersion !== 1
    || envelope.algorithm !== "Ed25519"
    || typeof envelope.keyId !== "string"
    || !KEY_ID_PATTERN.test(envelope.keyId)
    || typeof envelope.signature !== "string"
    || !/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature)
  ) {
    throw new Error("Firma de manifiesto inválida.");
  }
  return envelope;
}

function validateArtifact(artifact, version) {
  if (!isRecord(artifact)) throw new Error("Artefacto de manifiesto inválido.");
  const file = safeArtifactFile(artifact.file);
  if (artifact.key !== `releases/${version}/${file}`) throw new Error("Clave de artefacto inválida.");
  if (!Number.isSafeInteger(artifact.size) || artifact.size < 1 || !SHA512_PATTERN.test(artifact.sha512)) {
    throw new Error("Tamaño o hash de artefacto inválido.");
  }
}

function safeArtifactFile(value) {
  const file = String(value || "").normalize("NFC");
  if (
    file.length < 1
    || file.length > 180
    || file.includes("..")
    || file.includes("/")
    || file.includes("\\")
    || !/^[0-9A-Za-z][0-9A-Za-z ._()-]*$/.test(file)
  ) {
    throw new Error("Nombre de artefacto inválido.");
  }
  return file;
}

function importPrivateKey(value) {
  const privateKey = createPrivateKey({ key: decodeDer(value, "clave privada"), type: "pkcs8", format: "der" });
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("La clave privada no es Ed25519.");
  return privateKey;
}

function decodeDer(value, label) {
  if (typeof value !== "string" || value.length < 40 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error(`Formato de ${label} inválido.`);
  }
  return Buffer.from(value, "base64");
}

function sha512Base64(contents) {
  return createHash("sha512").update(contents).digest("base64");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function assertStrictSemVer(value) {
  if (typeof value !== "string" || !SEMVER_PATTERN.test(value)) throw new Error("Versión SemVer inválida.");
}

function asBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
