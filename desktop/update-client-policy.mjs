export function shouldEnableDesktopUpdater({ isPackaged, smokeTest, platform, arch }) {
  return Boolean(isPackaged && !smokeTest && platform === "win32" && arch === "x64");
}

export function resolveDesktopCentralUrl({ configuredUrl, activationSecret, allowLocal = false }) {
  const explicit = String(configuredUrl || "").trim();
  if (explicit) {
    return { url: validatedDesktopCentralUrl(explicit, allowLocal), source: "environment" };
  }

  let activation;
  try {
    activation = JSON.parse(String(activationSecret || ""));
  } catch {
    return null;
  }

  const activatedUrl = typeof activation?.centralAppUrl === "string" ? activation.centralAppUrl.trim() : "";
  if (!activatedUrl) return null;
  try {
    return { url: validatedDesktopCentralUrl(activatedUrl, allowLocal), source: "activation" };
  } catch {
    return null;
  }
}

function validatedDesktopCentralUrl(value, allowLocal) {
  const endpoint = new URL(String(value || "").trim());
  const local = endpoint.hostname === "127.0.0.1" || endpoint.hostname === "localhost";
  if (endpoint.protocol !== "https:" && !(allowLocal && local)) {
    throw new Error("El servidor central debe usar HTTPS.");
  }
  endpoint.pathname = endpoint.pathname.replace(/\/+$/, "");
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint.toString().replace(/\/+$/, "");
}

export function validatedDesktopUpdateFeedUrl(value, centralUrl) {
  const feed = new URL(String(value || ""));
  const central = new URL(String(centralUrl || ""));
  if (feed.protocol !== "https:" || feed.origin !== central.origin) {
    throw new Error("El feed de actualización no pertenece al servidor central.");
  }
  if (feed.pathname.replace(/\/+$/, "") !== "/api/desktop-updates/v1/feed" || feed.search || feed.hash) {
    throw new Error("Ruta de feed de actualización inválida.");
  }
  return feed.toString().replace(/\/+$/, "");
}

export function publicDesktopUpdateState(value) {
  const allowedStatuses = new Set(["idle", "checking", "available", "mandatory", "downloading", "ready", "postponed", "error"]);
  return Object.freeze({
    status: allowedStatuses.has(value?.status) ? value.status : "error",
    version: typeof value?.version === "string" ? value.version : null,
    kind: value?.kind === "mandatory" ? "mandatory" : value?.kind === "normal" ? "normal" : null,
    percent: Number.isFinite(value?.percent) ? Math.max(0, Math.min(100, Math.round(value.percent))) : null,
    checkedAt: typeof value?.checkedAt === "string" ? value.checkedAt : null,
    code: typeof value?.code === "string" && /^[a-z0-9_-]{1,50}$/.test(value.code) ? value.code : null,
  });
}

export function classifyDesktopUpdatePolicyResponse(status) {
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new Error("Estado HTTP de política de actualización inválido.");
  }
  if (status === 401 || status === 403) return "auth_required";
  if (status >= 200 && status < 300) return "continue";
  return "http_error";
}

export function nextDesktopUpdateReminderAt(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error("Fecha de recordatorio inválida.");
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

export function shouldDeferDesktopUpdate({ kind, version, deferredVersion, remindAt, now = new Date() }) {
  if (kind !== "normal" || !version || version !== deferredVersion || typeof remindAt !== "string") return false;
  const reminderTime = Date.parse(remindAt);
  return Number.isFinite(reminderTime) && reminderTime > now.getTime();
}

export function shouldInstallMandatoryUpdateOnClose({ kind, verifiedVersion, stateVersion, stateStatus, shuttingDown }) {
  return !shuttingDown && stateStatus === "ready" && kind === "mandatory" && Boolean(verifiedVersion && verifiedVersion === stateVersion);
}
