import { parseStrictSemVer } from "./release-policy.ts";

export interface DesktopReleaseArtifact {
  file: string;
  key: string;
  size: number;
  sha512: string;
}

export interface DesktopReleaseManifest {
  schemaVersion: 1;
  version: string;
  platform: "win32";
  arch: "x64";
  artifacts: DesktopReleaseArtifact[];
}

export function parseDesktopReleaseManifest(value: unknown): DesktopReleaseManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !parseStrictSemVer(value.version)) {
    throw new Error("Manifiesto de release inválido");
  }
  if (value.platform !== "win32" || value.arch !== "x64" || !Array.isArray(value.artifacts)) {
    throw new Error("Destino o artefactos de release inválidos");
  }
  const artifacts = value.artifacts.map((artifact) => parseArtifact(artifact, value.version as string));
  if (artifacts.length === 0) throw new Error("El release no contiene artefactos");
  if (new Set(artifacts.map((artifact) => artifact.file)).size !== artifacts.length) {
    throw new Error("El manifiesto contiene nombres de artefacto duplicados");
  }
  return {
    schemaVersion: 1,
    version: value.version as string,
    platform: "win32",
    arch: "x64",
    artifacts,
  };
}

export function manifestArtifactForFile(manifest: DesktopReleaseManifest, file: string) {
  const normalized = safeDesktopUpdateFile(file);
  return manifest.artifacts.find((artifact) => artifact.file === normalized) || null;
}

export function safeDesktopUpdateFile(value: string) {
  const file = String(value || "").normalize("NFC");
  if (
    file.length < 1
    || file.length > 180
    || file === "."
    || file === ".."
    || file.includes("..")
    || file.includes("/")
    || file.includes("\\")
    || !/^[0-9A-Za-z][0-9A-Za-z ._()-]*$/.test(file)
  ) {
    throw new Error("Nombre de artefacto inválido");
  }
  return file;
}

export function releaseMetadataKey(version: string, file: string) {
  if (!parseStrictSemVer(version)) throw new Error("Versión de release inválida");
  if (!["latest.yml", "release-manifest.json", "release-manifest.sig", "release-policy.json"].includes(file)) {
    throw new Error("Metadato de canal inválido");
  }
  return `releases/${version}/${file}`;
}

export function channelPointerKey(channel: "pilot" | "stable") {
  return `channels/${channel}/current.json`;
}

export function parseDesktopReleasePointer(value: unknown) {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.version !== "string" || !parseStrictSemVer(value.version)) {
    throw new Error("Puntero de canal inválido");
  }
  return { schemaVersion: 1 as const, version: value.version };
}

function parseArtifact(value: unknown, version: string): DesktopReleaseArtifact {
  if (!isRecord(value)) throw new Error("Artefacto de release inválido");
  const file = safeDesktopUpdateFile(String(value.file || ""));
  const expectedKey = `releases/${version}/${file}`;
  if (value.key !== expectedKey) throw new Error("La clave del artefacto no pertenece al release");
  if (!Number.isSafeInteger(value.size) || Number(value.size) <= 0) throw new Error("Tamaño de artefacto inválido");
  if (typeof value.sha512 !== "string" || !/^[A-Za-z0-9+/]{86}==$/.test(value.sha512)) {
    throw new Error("SHA-512 de artefacto inválido");
  }
  return { file, key: expectedKey, size: Number(value.size), sha512: value.sha512 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
