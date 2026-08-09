export const DESKTOP_UPDATE_CHANNELS = ["pilot", "stable"] as const;
export const DESKTOP_UPDATE_KINDS = ["normal", "mandatory"] as const;
export const DESKTOP_UPDATE_STATUSES = [
  "idle",
  "checking",
  "available",
  "downloading",
  "downloaded",
  "postponed",
  "installed",
  "error",
  "blocked",
] as const;

export type DesktopUpdateChannel = (typeof DESKTOP_UPDATE_CHANNELS)[number];
export type DesktopUpdateKind = (typeof DESKTOP_UPDATE_KINDS)[number];
export type DesktopUpdateStatus = (typeof DESKTOP_UPDATE_STATUSES)[number];

export interface DesktopUpdateReleasePolicy {
  version: string;
  minimumVersion: string;
  kind: DesktopUpdateKind;
  effectiveAt?: string;
  platform: "win32";
  arch: "x64";
}
