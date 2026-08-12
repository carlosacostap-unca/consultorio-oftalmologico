import type { SyncDevice } from "../desktop-sync/types";
import type { DesktopUpdateChannel } from "./types";

export type DesktopUpdateAccessDecision =
  | { allowed: true; channel: DesktopUpdateChannel }
  | { allowed: false; status: number; code: string };

export function desktopUpdateAccessDecision(input: {
  sessionValid: boolean;
  requestedDeviceId: string;
  device: SyncDevice | null;
}): DesktopUpdateAccessDecision {
  if (!input.sessionValid) return denied(401, "invalid_session");
  if (!input.requestedDeviceId) return denied(400, "missing_device");
  if (!input.device || input.device.deviceId !== input.requestedDeviceId) {
    return denied(403, "unknown_device");
  }
  if (!input.device.enabled) return denied(403, "disabled_device");
  if (!input.device.updatesEnabled) return denied(403, "updates_disabled");
  return { allowed: true, channel: normalizeDesktopUpdateChannel(input.device.updateChannel) };
}

export function normalizeDesktopUpdateChannel(value: unknown): DesktopUpdateChannel {
  return value === "pilot" ? "pilot" : "stable";
}

function denied(status: number, code: string): DesktopUpdateAccessDecision {
  return { allowed: false, status, code };
}
