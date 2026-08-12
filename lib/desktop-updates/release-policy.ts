import type { DesktopUpdateKind, DesktopUpdateReleasePolicy } from "./types";

export type DesktopUpdateEvaluation =
  | { status: "up-to-date"; version: string }
  | { status: "available"; version: string; kind: DesktopUpdateKind }
  | { status: "unsupported-target" }
  | { status: "invalid-installed-version" };

interface ParsedSemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: Array<number | string>;
}

export function parseDesktopUpdateReleasePolicy(value: unknown): DesktopUpdateReleasePolicy {
  if (!isRecord(value)) throw new Error("La política de actualización debe ser un objeto");

  const version = strictSemVer(value.version, "version");
  const minimumVersion = strictSemVer(value.minimumVersion, "minimumVersion");
  if (compareSemVer(minimumVersion, version) > 0) {
    throw new Error("minimumVersion no puede superar la versión publicada");
  }
  if (value.kind !== "normal" && value.kind !== "mandatory") {
    throw new Error("La política debe ser normal o mandatory");
  }
  if (value.platform !== "win32" || value.arch !== "x64") {
    throw new Error("La política sólo admite win32-x64");
  }

  const effectiveAt = optionalIsoDate(value.effectiveAt);
  return {
    version,
    minimumVersion,
    kind: value.kind,
    ...(effectiveAt ? { effectiveAt } : {}),
    platform: "win32",
    arch: "x64",
  };
}

export function evaluateDesktopUpdatePolicy(input: {
  installedVersion: string;
  platform: string;
  arch: string;
  osRelease: string;
  policy: DesktopUpdateReleasePolicy;
  now?: Date;
}): DesktopUpdateEvaluation {
  if (!isWindows11X64(input.platform, input.arch, input.osRelease)) {
    return { status: "unsupported-target" };
  }
  if (!parseStrictSemVer(input.installedVersion)) {
    return { status: "invalid-installed-version" };
  }
  if (compareSemVer(input.installedVersion, input.policy.version) >= 0) {
    return { status: "up-to-date", version: input.policy.version };
  }

  const mandatoryByMinimum = compareSemVer(input.installedVersion, input.policy.minimumVersion) < 0;
  const effective = !input.policy.effectiveAt
    || new Date(input.policy.effectiveAt).getTime() <= (input.now || new Date()).getTime();
  const mandatory = mandatoryByMinimum || (input.policy.kind === "mandatory" && effective);
  return { status: "available", version: input.policy.version, kind: mandatory ? "mandatory" : "normal" };
}

export function isWindows11X64(platform: string, arch: string, osRelease: string) {
  if (platform !== "win32" || arch !== "x64") return false;
  const match = /^10\.0\.(\d+)(?:\.|$)/.exec(osRelease);
  return Boolean(match && Number(match[1]) >= 22000);
}

export function parseStrictSemVer(value: unknown): ParsedSemVer | null {
  if (typeof value !== "string") return null;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]
      ? match[4].split(".").map((part) => /^\d+$/.test(part) ? Number(part) : part)
      : [],
  };
}

export function compareSemVer(left: string, right: string) {
  const a = parseStrictSemVer(left);
  const b = parseStrictSemVer(right);
  if (!a || !b) throw new Error("No se pueden comparar versiones SemVer inválidas");

  for (const key of ["major", "minor", "patch"] as const) {
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

function strictSemVer(value: unknown, name: string) {
  if (typeof value !== "string" || !parseStrictSemVer(value)) {
    throw new Error(`${name} debe ser SemVer estricto`);
  }
  return value;
}

function optionalIsoDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error("effectiveAt debe ser una fecha UTC ISO válida");
  }
  if (Number.isNaN(new Date(value).getTime())) throw new Error("effectiveAt no es una fecha válida");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
