const DESKTOP_WRITABLE_COLLECTIONS = new Set([
  "pacientes",
  "consultas",
  "recetas",
  "users",
]);

const DESKTOP_BOOTSTRAP_WRITABLE_COLLECTIONS = new Set([
  "mutuales",
]);

export const DESKTOP_SYNC_ORIGIN_HEADER = "x-consultorio-sync-origin";
export const DESKTOP_CENTRAL_SYNC_ORIGIN = "central";

export const DESKTOP_SCOPE_MESSAGE =
  "La versión de escritorio offline permite modificar pacientes, consultas y recetas. Para administrar turnos, mutuales, usuarios o configuración usá la versión web con conexión.";

export function isDesktopWritableCollection(collection: string): boolean {
  return DESKTOP_WRITABLE_COLLECTIONS.has(collection) || collection.startsWith("sync_");
}

export function isDesktopBootstrapWritableCollection(collection: string): boolean {
  return DESKTOP_BOOTSTRAP_WRITABLE_COLLECTIONS.has(collection);
}

export function desktopCollectionFromRequest(url: string): string | null {
  try {
    const pathname = new URL(url, "http://127.0.0.1").pathname;
    const match = pathname.match(/^\/api\/collections\/([^/]+)\/records(?:\/|$)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function isDesktopSupportedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return ["/pacientes", "/consultas", "/recetas", "/sincronizacion"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
