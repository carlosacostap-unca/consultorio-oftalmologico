import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  parseDesktopReleaseManifestJson,
  validateDesktopUpdatePublicKeys,
  verifyReleaseArtifactFile,
  verifySignatureEnvelope,
} from "../desktop/update-integrity.mjs";

const STRICT_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const MAX_SAMPLE_BYTES = 64 * 1024;

export class CorruptDesktopDownloadVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CorruptDesktopDownloadVerificationError";
    this.code = code;
  }
}

export async function verifyCorruptDesktopDownload({
  readObject,
  readArtifactRange,
  publicKeysById,
  verifySignature = verifySignatureEnvelope,
  verifyArtifactFile = verifyReleaseArtifactFile,
  temporaryRoot = tmpdir(),
}) {
  const publicKeys = validateDesktopUpdatePublicKeys(publicKeysById);
  const pointer = parsePilotPointer(await readObject("channels/pilot/current.json"));
  const releasePrefix = `releases/${pointer.version}`;
  const manifestBytes = asBuffer(await readObject(`${releasePrefix}/release-manifest.json`));
  const signatureText = asBuffer(await readObject(`${releasePrefix}/release-manifest.sig`)).toString("utf8");

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
    throw new CorruptDesktopDownloadVerificationError(
      "authentic_manifest_rejected",
      "La firma del manifiesto piloto auténtico no pudo validarse.",
    );
  }

  const artifact = manifest.artifacts.find((candidate) => candidate.file.toLowerCase().endsWith(".exe"));
  if (!artifact) {
    throw new CorruptDesktopDownloadVerificationError(
      "installer_not_found",
      "El manifiesto piloto no contiene un instalador Windows x64.",
    );
  }

  const requestedBytes = Math.min(artifact.size, MAX_SAMPLE_BYTES);
  const sample = asBuffer(await readArtifactRange(artifact.key, requestedBytes));
  if (sample.byteLength < 1 || sample.byteLength > requestedBytes) {
    throw new CorruptDesktopDownloadVerificationError(
      "invalid_artifact_sample",
      "La muestra acotada del instalador no es válida.",
    );
  }

  const corruptCopy = Buffer.from(sample);
  let mismatch = "size";
  if (corruptCopy.byteLength === artifact.size) {
    corruptCopy[0] ^= 0xff;
    mismatch = "sha512";
  }

  const temporaryDirectory = await mkdtemp(path.join(path.resolve(temporaryRoot), "consultorio-corrupt-download-"));
  const corruptPath = path.join(temporaryDirectory, artifact.file);
  try {
    await writeFile(corruptPath, corruptCopy, { flag: "wx" });
    try {
      await verifyArtifactFile(manifest, corruptPath);
    } catch (error) {
      if (error instanceof Error && error.message === `Integridad inválida para ${artifact.file}.`) {
        return {
          channel: "pilot",
          version: pointer.version,
          artifact: artifact.file,
          sampledBytes: sample.byteLength,
          expectedBytes: artifact.size,
          mismatch,
          corruptArtifactRejected: true,
        };
      }
      throw new CorruptDesktopDownloadVerificationError(
        "integrity_verification_unavailable",
        "La barrera de integridad no pudo comprobar la copia local corrupta.",
      );
    }
    throw new CorruptDesktopDownloadVerificationError(
      "corrupt_artifact_accepted",
      "La copia local corrupta fue aceptada inesperadamente.",
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
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
  return new CorruptDesktopDownloadVerificationError(
    "invalid_release_metadata",
    "El puntero, manifiesto o sobre de firma piloto no es válido.",
  );
}

function asBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}
