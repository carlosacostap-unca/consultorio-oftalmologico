import "server-only";

export function desktopLocalMutationHeaders(user: Record<string, unknown>) {
  if (process.env.DESKTOP_RUNTIME !== "1") return undefined;
  const deviceId = String(process.env.DESKTOP_DEVICE_ID || "");
  const actorId = String(user.id || "");
  if (!deviceId || !actorId) throw new Error("El runtime local no informó equipo y usuario para la operación clínica.");
  return {
    "x-consultorio-device-id": deviceId,
    "x-consultorio-actor-id": actorId,
  };
}
