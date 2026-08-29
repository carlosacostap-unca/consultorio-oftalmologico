import {
  parseDesktopReleaseManifestJson,
  validateDesktopUpdatePublicKeys,
  verifySignatureEnvelope,
} from "../desktop/update-integrity.mjs";

const STRICT_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export class DesktopStablePreflightVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DesktopStablePreflightVerificationError";
    this.code = code;
  }
}

export async function verifyDesktopStablePreflight({
  readObject,
  publicKeysById,
  verifySignature = verifySignatureEnvelope,
}) {
  const publicKeys = validateDesktopUpdatePublicKeys(publicKeysById);
  const [pilot, stable] = await Promise.all([
    verifyChannel("pilot", readObject, publicKeys, verifySignature),
    verifyChannel("stable", readObject, publicKeys, verifySignature),
  ]);

  if (compareSemVer(pilot.version, stable.version) <= 0) {
    throw new DesktopStablePreflightVerificationError(
      "pilot_not_newer",
      "La versión pilot debe ser estrictamente posterior a la versión stable vigente.",
    );
  }

  return {
    pilot,
    stable,
    candidateVersion: pilot.version,
    target: "win32-x64",
    promotionEligible: true,
  };
}

async function verifyChannel(channel, readObject, publicKeys, verifySignature) {
  const pointer = parsePointer(await readObject(`channels/${channel}/current.json`), channel);
  const releasePrefix = `releases/${pointer.version}`;
  const [manifestValue, signatureValue, policyValue] = await Promise.all([
    readObject(`${releasePrefix}/release-manifest.json`),
    readObject(`${releasePrefix}/release-manifest.sig`),
    readObject(`${releasePrefix}/release-policy.json`),
  ]);
  const manifestBytes = asBuffer(manifestValue);
  const signatureText = asBuffer(signatureValue).toString("utf8");

  let manifest;
  try {
    manifest = parseDesktopReleaseManifestJson(manifestBytes.toString("utf8"));
  } catch {
    throw invalidMetadata(channel);
  }
  if (manifest.version !== pointer.version) throw invalidMetadata(channel);

  let signatureAccepted;
  try {
    signatureAccepted = verifySignature(manifestBytes, signatureText, publicKeys);
  } catch {
    throw invalidMetadata(channel);
  }
  if (!signatureAccepted) {
    throw new DesktopStablePreflightVerificationError(
      "invalid_manifest_signature",
      `La firma Ed25519 del manifiesto ${channel} no es válida.`,
    );
  }

  const policy = parsePolicy(policyValue, pointer.version, channel);
  const installers = manifest.artifacts.filter((artifact) => artifact.file.toLowerCase().endsWith(".exe"));
  if (installers.length !== 1) {
    throw new DesktopStablePreflightVerificationError(
      "invalid_installer_count",
      `El release ${channel} debe contener exactamente un instalador Windows x64.`,
    );
  }

  return {
    channel,
    version: pointer.version,
    kind: policy.kind,
    minimumVersion: policy.minimumVersion,
    artifactCount: manifest.artifacts.length,
    installer: installers[0].file,
    signatureAccepted: true,
  };
}

function parsePointer(value, channel) {
  let pointer;
  try {
    pointer = JSON.parse(asBuffer(value).toString("utf8"));
  } catch {
    throw invalidMetadata(channel);
  }
  if (
    !isRecord(pointer)
    || pointer.schemaVersion !== 1
    || typeof pointer.version !== "string"
    || !STRICT_SEMVER_PATTERN.test(pointer.version)
  ) {
    throw invalidMetadata(channel);
  }
  return { version: pointer.version };
}

function parsePolicy(value, expectedVersion, channel) {
  let policy;
  try {
    policy = JSON.parse(asBuffer(value).toString("utf8"));
  } catch {
    throw invalidMetadata(channel);
  }
  if (
    !isRecord(policy)
    || policy.version !== expectedVersion
    || typeof policy.minimumVersion !== "string"
    || !STRICT_SEMVER_PATTERN.test(policy.minimumVersion)
    || compareSemVer(policy.minimumVersion, expectedVersion) > 0
    || !["normal", "mandatory"].includes(policy.kind)
    || policy.platform !== "win32"
    || policy.arch !== "x64"
    || !validOptionalIsoDate(policy.effectiveAt)
  ) {
    throw invalidMetadata(channel);
  }
  return policy;
}

function compareSemVer(left, right) {
  const a = parseSemVer(left);
  const b = parseSemVer(right);
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) return leftPart === undefined ? -1 : 1;
    if (leftPart === rightPart) continue;
    if (typeof leftPart === "number" && typeof rightPart === "string") return -1;
    if (typeof leftPart === "string" && typeof rightPart === "number") return 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

function parseSemVer(value) {
  const match = STRICT_SEMVER_PATTERN.exec(value);
  if (!match) throw new Error("Versión SemVer inválida.");
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]
      ? match[4].split(".").map((part) => /^\d+$/.test(part) ? Number(part) : part)
      : [],
  };
}

function validOptionalIsoDate(value) {
  if (value === undefined) return true;
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function invalidMetadata(channel) {
  return new DesktopStablePreflightVerificationError(
    "invalid_release_metadata",
    `El puntero, manifiesto, firma o política de ${channel} no es válido.`,
  );
}

function asBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
