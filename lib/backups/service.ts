export interface BackupItem {
  key: string;
  modified: string;
  size: number;
  automatic: boolean;
}

export interface BackupSettings {
  cron?: string;
  cronMaxKeep?: number;
  s3?: { enabled?: boolean; endpoint?: string; bucket?: string; region?: string; forcePathStyle?: boolean };
}

export interface BackupDependencies {
  isDesktop: boolean;
  authorize(request: Request): Promise<{ id: string } | null>;
  settings(): Promise<BackupSettings>;
  list(): Promise<unknown>;
  downloadsEnabled(): boolean;
  sign(settings: BackupSettings, key: string): Promise<string>;
}

export class BackupError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function validBackupKey(key: unknown): key is string {
  return typeof key === "string" && key.length <= 200
    && /^[a-zA-Z0-9@][a-zA-Z0-9_@. -]*\.zip$/.test(key) && !key.includes("..");
}

export function backupItems(raw: unknown): BackupItem[] {
  if (!Array.isArray(raw)) throw new BackupError(502, "No se pudo consultar el listado de backups.");
  return raw.flatMap((item) => {
    if (!item || !validBackupKey(item.key) || !Number.isSafeInteger(item.size) || item.size < 0
      || typeof item.modified !== "string") return [];
    const date = new Date(item.modified.replace(" ", "T"));
    if (!Number.isFinite(date.getTime())) return [];
    return [{ key: item.key, modified: date.toISOString(), size: item.size, automatic: item.key.startsWith("@auto_") }];
  }).sort((a, b) => b.modified.localeCompare(a.modified) || a.key.localeCompare(b.key));
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" } });
}

async function authorize(request: Request, deps: BackupDependencies) {
  if (deps.isDesktop) throw new BackupError(403, "Los backups se consultan desde el servidor central.");
  const user = await deps.authorize(request);
  if (!user) throw new BackupError(403, "Sólo los administradores con sesión vigente pueden acceder a los backups.");
  const desktopUser = request.headers.get("x-backup-user-id");
  if (desktopUser !== null && desktopUser !== user.id) {
    throw new BackupError(403, "Volvé a iniciar sesión con conexión para acceder a los backups.");
  }
}

async function settings(deps: BackupDependencies) {
  const config = await deps.settings();
  if (!config?.s3?.enabled) throw new BackupError(503, "El almacenamiento externo de backups no está configurado.");
  return config;
}

function failure(error: unknown) {
  return error instanceof BackupError
    ? json({ error: error.message }, error.status)
    : json({ error: "No se pudo acceder a los backups. Intentá nuevamente más tarde." }, 502);
}

export async function listBackupResponse(request: Request, deps: BackupDependencies) {
  try {
    await authorize(request, deps);
    const config = await settings(deps);
    const items = backupItems(await deps.list());
    return json({ items, automaticLimit: Number.isSafeInteger(config.cronMaxKeep) && Number(config.cronMaxKeep) > 0 ? config.cronMaxKeep : null,
      downloadsEnabled: deps.downloadsEnabled() });
  } catch (error) { return failure(error); }
}

export async function downloadBackupResponse(request: Request, deps: BackupDependencies) {
  try {
    await authorize(request, deps);
    const body = await request.json().catch(() => null);
    if (!validBackupKey(body?.key)) throw new BackupError(400, "El nombre del backup no es válido.");
    const config = await settings(deps);
    if (!deps.downloadsEnabled()) throw new BackupError(503, "La descarga de backups todavía no está habilitada. Contactá al administrador del servidor.");
    const items = backupItems(await deps.list());
    if (!items.some((item) => item.key === body.key)) throw new BackupError(404, "El backup ya no está disponible. Actualizá el listado.");
    const url = await deps.sign(config, body.key);
    return json({ url, expiresIn: 300 });
  } catch (error) { return failure(error); }
}
