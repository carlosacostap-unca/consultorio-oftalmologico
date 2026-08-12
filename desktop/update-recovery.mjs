export function assertDesktopPostUpdateHealth({
  pocketBaseHealthy,
  nextHealthy,
  migrationsHealthy,
  identityPreserved,
}) {
  if (!migrationsHealthy) throw new Error("Las migraciones locales no finalizaron correctamente.");
  if (!pocketBaseHealthy) throw new Error("PocketBase local no superó la comprobación de salud.");
  if (!nextHealthy) throw new Error("La interfaz local no superó la comprobación de salud.");
  if (!identityPreserved) throw new Error("La identidad del equipo no coincide con el respaldo previo.");
  return true;
}
