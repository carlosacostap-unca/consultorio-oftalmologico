export class ExpiredDesktopUpdateUrlVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ExpiredDesktopUpdateUrlVerificationError";
    this.code = code;
  }
}

export async function verifyExpiredDesktopUpdateUrl({
  readTextObject,
  presignGetObject,
  requestRange,
  sleep = defaultSleep,
  expiryWaitMs = 3000,
}) {
  const pointer = parsePilotPointer(await readTextObject("channels/pilot/current.json"));
  const manifestKey = `releases/${pointer.version}/release-manifest.json`;
  const manifest = parseManifest(await readTextObject(manifestKey), pointer.version);
  const artifact = selectArtifact(manifest);

  const expiredUrl = await presignGetObject(artifact.key, 1);
  await sleep(expiryWaitMs);
  const expiredResponse = await requestRange(expiredUrl);
  if (expiredResponse.ok) {
    throw new ExpiredDesktopUpdateUrlVerificationError(
      "expired_url_accepted",
      "La URL vencida todavía fue aceptada por el almacenamiento.",
    );
  }

  const freshUrl = await presignGetObject(artifact.key, 60);
  if (freshUrl === expiredUrl) {
    throw new ExpiredDesktopUpdateUrlVerificationError(
      "url_not_refreshed",
      "El reintento no generó una URL diferente.",
    );
  }
  const freshResponse = await requestRange(freshUrl);
  if (!freshResponse.ok) {
    throw new ExpiredDesktopUpdateUrlVerificationError(
      "fresh_url_rejected",
      "La URL nueva fue rechazada por el almacenamiento.",
    );
  }

  return {
    channel: "pilot",
    version: pointer.version,
    artifact: artifact.file,
    expiredStatus: expiredResponse.status,
    freshStatus: freshResponse.status,
  };
}

function parsePilotPointer(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw invalidMetadata();
  }
  if (
    !isRecord(value)
    || value.schemaVersion !== 1
    || typeof value.version !== "string"
    || !isStrictSemVer(value.version)
  ) {
    throw invalidMetadata();
  }
  return { version: value.version };
}

function parseManifest(text, expectedVersion) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw invalidMetadata();
  }
  if (
    !isRecord(value)
    || value.schemaVersion !== 1
    || value.version !== expectedVersion
    || value.platform !== "win32"
    || value.arch !== "x64"
    || !Array.isArray(value.artifacts)
    || value.artifacts.length === 0
  ) {
    throw invalidMetadata();
  }

  const prefix = `releases/${expectedVersion}/`;
  const artifacts = value.artifacts.map((artifact) => {
    if (!isRecord(artifact)) throw invalidMetadata();
    const file = String(artifact.file || "");
    const key = String(artifact.key || "");
    if (
      !/^[0-9A-Za-z][0-9A-Za-z ._()-]*$/.test(file)
      || file.length > 180
      || file.includes("..")
      || file.includes("/")
      || file.includes("\\")
      || key !== `${prefix}${file}`
      || !Number.isSafeInteger(artifact.size)
      || Number(artifact.size) <= 0
      || typeof artifact.sha512 !== "string"
      || !/^[A-Za-z0-9+/]{86}==$/.test(artifact.sha512)
    ) {
      throw invalidMetadata();
    }
    return { file, key };
  });
  return { artifacts };
}

function selectArtifact(manifest) {
  return manifest.artifacts.find((artifact) => artifact.file.toLowerCase().endsWith(".exe"))
    || manifest.artifacts[0];
}

function invalidMetadata() {
  return new ExpiredDesktopUpdateUrlVerificationError(
    "invalid_release_metadata",
    "El puntero o manifiesto piloto no es válido.",
  );
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStrictSemVer(value) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(value);
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
