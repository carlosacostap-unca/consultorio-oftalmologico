export type DesktopDeviceAccess = "skip" | "missing" | "lookup";

export function desktopDeviceAccess(
  requireDevice: boolean | undefined,
  deviceId: string,
): DesktopDeviceAccess {
  if (requireDevice !== true) return "skip";
  return deviceId ? "lookup" : "missing";
}
