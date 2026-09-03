import {
  canonicalJson,
  parseDesktopReleaseManifestJson,
  validateDesktopUpdatePublicKeys,
  verifySignatureEnvelope,
} from "../desktop/update-integrity.mjs";

const STRICT_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export class TamperedDesktopManifestVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TamperedDesktopManifestVerificationError";
    this.code = code;
  }
}

export async function verifyTamperedDesktopManifest({
  readObject,
  publicKeysById,
  verifySignature = verifySignatureEnvelope,
}) {
  const publicKeys = validateDesktopUpdatePublicKeys(publicKeysById);
  const pointer = parsePilotPointer(await readObject("channels/pilot/current.json"));
  const releasePrefix = `releases/${pointer.version}`;
  const manifestKey = `${releasePrefix}/release-manifest.json`;
  const signatureKey = `${releasePrefix}/release-manifest.sig`;
  const [manifestValue, signatureValue] = await Promise.all([
    readObject(manifestKey),
    readObject(signatureKey),
  ]);
  const manifestBytes = asBuffer(manifestValue);
  const signatureText = asBuffer(signatureValue).toString("utf8");

  let manifest;
  try {
    manifest = parseDesktopReleaseManifestJson(manifestBytes.toString("utf8"));
  } catch {
    throw invalidMetadata();
  }
  if (manifest.version !== pointer.version) throw invalidMetadata();

  let authenticAccepted;
  try {
    authenticAccepted = verifySignature(manifestBytes, signatureText, publicKeys);
  } catch {
    throw invalidMetadata();
  }
  if (!authenticAccepted) {
    throw new TamperedDesktopManifestVerificationError(
      "authentic_manifest_rejected",
      "La firma del manifiesto piloto auténtico no pudo validarse.",
    );
  }

  const alteredManifest = JSON.parse(JSON.stringify(manifest));
  const artifact = alteredManifest.artifacts[0];
  artifact.sha512 = `${artifact.sha512.startsWith("A") ? "B" : "A"}${artifact.sha512.slice(1)}`;
  const alteredBytes = Buffer.from(canonicalJson(alteredManifest), "utf8");

  let alteredAccepted;
  try {
    alteredAccepted = verifySignature(alteredBytes, signatureText, publicKeys);
  } catch {
    alteredAccepted = false;
  }
  if (alteredAccepted) {
    throw new TamperedDesktopManifestVerificationError(
      "tampered_manifest_accepted",
      "La copia alterada del manifiesto fue aceptada inesperadamente.",
    );
  }

  return {
    channel: "pilot",
    version: pointer.version,
    artifact: manifest.artifacts[0].file,
    authenticManifestAccepted: true,
    alteredManifestRejected: true,
  };
}

function parsePilotPointer(value) {
  let pointer;
  try {
    pointer = JSON.parse(asBuffer(value).toString("utf8"));
  } catch {
    throw invalidMetadata();
  }
  if (
    !pointer
    || typeof pointer !== "object"
    || Array.isArray(pointer)
    || pointer.schemaVersion !== 1
    || typeof pointer.version !== "string"
    || !STRICT_SEMVER_PATTERN.test(pointer.version)
  ) {
    throw invalidMetadata();
  }
  return { version: pointer.version };
}

function invalidMetadata() {
  return new TamperedDesktopManifestVerificationError(
    "invalid_release_metadata",
    "El puntero, manifiesto o sobre de firma piloto no es válido.",
  );
}

function asBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}
