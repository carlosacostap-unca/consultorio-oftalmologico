function adminUser(record) {
  const roles = Array.isArray(record?.roles) && record.roles.length ? record.roles : [record?.role];
  return typeof record?.id === "string" && roles.includes("admin");
}

// No user-controlled origin, request path or central token is accepted by this bridge.
export async function requestCentralBackups(input, { pocketBaseUrl, centralUrl, centralToken, fetchImpl = fetch }) {
  if (input?.activeRole !== "admin" || !input?.localToken || !centralUrl || !centralToken) {
    return { ok: false, status: 403, body: { error: "Iniciá sesión como administrador con conexión para acceder a los backups." } };
  }
  const base = new URL(centralUrl);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("Servidor central no válido.");
  const auth = await fetchImpl(`${pocketBaseUrl}/api/collections/users/auth-refresh`, {
    method: "POST", headers: { Authorization: `Bearer ${input.localToken}` }, signal: AbortSignal.timeout(15000),
  });
  if (!auth.ok) return { ok: false, status: 403, body: { error: "La sesión local no es válida." } };
  const { record } = await auth.json();
  if (!adminUser(record)) return { ok: false, status: 403, body: { error: "Sólo los administradores pueden acceder a los backups." } };
  const download = input.action === "download";
  if (!download && input.action !== "list") throw new Error("Acción de backups no válida.");
  const response = await fetchImpl(`${centralUrl.replace(/\/$/, "")}/api/backups${download ? "/download" : ""}`, {
    method: download ? "POST" : "GET", redirect: "error",
    headers: { Authorization: `Bearer ${centralToken}`, "Content-Type": "application/json", "x-active-role": "admin", "x-backup-user-id": record.id },
    body: download ? JSON.stringify({ key: input.key }) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({ error: "No se pudo consultar el servidor central." })) };
}
