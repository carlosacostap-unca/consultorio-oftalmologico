import { app, BrowserWindow, ipcMain, safeStorage, shell } from "electron";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { normalizeLocalSystemSetting, normalizeLocalUserId } from "./local-record-policy.mjs";
import { createVerifiedDesktopBackup, verifyDesktopBackup } from "./update-backup.mjs";
import {
  parseDesktopReleaseManifestJson,
  validateDesktopUpdatePublicKeys,
  verifyReleaseArtifactFile,
  verifySignatureEnvelope,
} from "./update-integrity.mjs";
import { stopManagedServices, waitWithTimeout } from "./update-maintenance.mjs";
import { assertDesktopPostUpdateHealth } from "./update-recovery.mjs";
import {
  initializeDesktopUpdaterWithoutBlocking,
  resolveElectronAutoUpdater,
} from "./update-loader.mjs";
import {
  publicDesktopUpdateState,
  nextDesktopUpdateReminderAt,
  resolveDesktopCentralUrl,
  shouldEnableDesktopUpdater,
  shouldDeferDesktopUpdate,
  shouldInstallMandatoryUpdateOnClose,
  validatedDesktopUpdateFeedUrl,
} from "./update-client-policy.mjs";

const desktopDir = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = !app.isPackaged;
const children = new Set();
const serviceChildren = new Map();
let mainWindow = null;
let shuttingDown = false;
let runtime = null;
let localAdminToken = "";
let desktopAutoUpdater = null;
let updateCheckInFlight = null;
let updateInterval = null;
let updateKind = null;
let updateState = publicDesktopUpdateState({ status: "idle" });
let currentUpdateFeedUrl = "";
let verifiedDownloadedUpdate = null;
let maintenanceBarrier = false;
let maintenanceWaiter = null;
let updateReminderTimeout = null;
let updateInstallInFlight = null;

app.commandLine.appendSwitch("disable-features", "AutofillServerCommunication");

function sanitizeLog(value) {
  return String(value)
    .replace(/https?:\/\/[^\s"'<>]+/gi, (candidate) => {
      try {
        const url = new URL(candidate);
        return url.search ? `${url.origin}${url.pathname}?[REDACTED_QUERY]` : candidate;
      } catch {
        return "[REDACTED_URL]";
      }
    })
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "[REDACTED_JWT]")
    .replace(/(password|token|secret|authorization)([\"'=:\s]+)[^\s,;]+/gi, "$1$2[REDACTED]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 4000);
}

async function rotateLog(logPath) {
  try {
    const info = await stat(logPath);
    if (info.size < 2 * 1024 * 1024) return;
    const previous = `${logPath}.1`;
    if (existsSync(previous)) await rename(previous, `${previous}.old`).catch(() => undefined);
    await rename(logPath, previous);
  } catch {
    // Todavia no existe un log que rotar.
  }
}

async function log(level, message, details = "") {
  if (!runtime?.logPath) return;
  await rotateLog(runtime.logPath);
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${sanitizeLog(message)} ${sanitizeLog(details)}\n`;
  await writeFile(runtime.logPath, line, { flag: "a" }).catch(() => undefined);
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForHealth(url, timeoutMs = 30_000, requestTimeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`El servicio no respondio en ${url}: ${lastError?.message ?? "timeout"}`);
}

async function readOrCreateJson(filePath, createValue) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    const value = await createValue();
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" }).catch(async (writeError) => {
      if (writeError?.code !== "EEXIST") throw writeError;
    });
    return JSON.parse(await readFile(filePath, "utf8"));
  }
}

function deviceCodeFromId(deviceId) {
  return `PC-${deviceId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

async function initializeRuntime() {
  const dataRoot = app.getPath("userData");
  const logsDir = path.join(dataRoot, "logs");
  const pocketBaseDataDir = path.join(dataRoot, "pocketbase", "pb_data");
  const secretsDir = path.join(dataRoot, "secure");
  await Promise.all([
    mkdir(logsDir, { recursive: true }),
    mkdir(pocketBaseDataDir, { recursive: true }),
    mkdir(secretsDir, { recursive: true }),
  ]);

  const identity = await readOrCreateJson(path.join(dataRoot, "device.json"), async () => {
    const deviceId = randomUUID();
    return { deviceId, deviceCode: deviceCodeFromId(deviceId), createdAt: new Date().toISOString() };
  });
  const pocketBasePort = await findFreePort();
  const nextPort = isDevelopment ? null : await findFreePort();
  const resourcesRoot = isDevelopment ? desktopDir : process.resourcesPath;
  const configuredCentralUrl = process.env.DESKTOP_CENTRAL_URL || process.env.NEXT_PUBLIC_APP_URL || "";

  runtime = {
    appVersion: app.getVersion(),
    isDevelopment,
    dataRoot,
    logsDir,
    logPath: path.join(logsDir, "desktop.log"),
    secretsDir,
    pocketBaseDataDir,
    pocketBaseUrl: `http://127.0.0.1:${pocketBasePort}`,
    pocketBasePort,
    pocketBaseExe: path.join(resourcesRoot, "pocketbase", "pocketbase.exe"),
    migrationsDir: path.join(resourcesRoot, "pocketbase", "pb_migrations"),
    hooksDir: path.join(resourcesRoot, "pocketbase", "pb_hooks"),
    nextPort,
    nextServer: isDevelopment ? null : path.join(resourcesRoot, "app", "server.js"),
    rendererUrl: isDevelopment
      ? process.env.DESKTOP_DEV_URL || "http://127.0.0.1:3000"
      : `http://127.0.0.1:${nextPort}`,
    configuredCentralUrl,
    centralUrl: configuredCentralUrl,
    deviceId: identity.deviceId,
    deviceCode: identity.deviceCode,
  };
  await loadPendingUpdateState();
}

async function loadPendingUpdateState() {
  const pendingPath = path.join(runtime.dataRoot, "pending-update.json");
  try {
    const pending = JSON.parse(await readFile(pendingPath, "utf8"));
    if (
      pending?.schemaVersion !== 1
      || typeof pending.sourceVersion !== "string"
      || typeof pending.targetVersion !== "string"
      || !/^backup-[0-9TZ-]+-[a-f0-9]{8}$/.test(pending.backupName || "")
    ) throw new Error("Estado de actualización pendiente inválido.");
    const backupDirectory = path.resolve(runtime.dataRoot, "backups", pending.backupName);
    const backupsRoot = path.resolve(runtime.dataRoot, "backups");
    if (path.dirname(backupDirectory) !== backupsRoot) throw new Error("Ruta de recuperación inválida.");
    await verifyDesktopBackup(backupDirectory);
    runtime.pendingUpdate = { ...pending, backupDirectory, pendingPath };
    runtime.recoveryBackupPath = backupDirectory;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function completePendingUpdateHealthCheck() {
  const pending = runtime.pendingUpdate;
  if (!pending || process.argv.includes("--smoke-test")) return;
  await verifyDesktopBackup(pending.backupDirectory);
  if (runtime.appVersion === pending.sourceVersion) {
    await log("warn", "La instalación preparada no reemplazó la versión anterior", `target=${pending.targetVersion}`);
    await reportDesktopUpdate("error", pending.targetVersion, "installer_not_applied");
    await unlink(pending.pendingPath);
    runtime.pendingUpdate = null;
    return;
  }
  if (runtime.appVersion !== pending.targetVersion) throw new Error("La versión iniciada no coincide con la actualización preparada.");
  const [currentIdentity, backupIdentity] = await Promise.all([
    readFile(path.join(runtime.dataRoot, "device.json")),
    readFile(path.join(pending.backupDirectory, "device.json")),
  ]);
  assertDesktopPostUpdateHealth({
    pocketBaseHealthy: serviceChildren.has("pocketbase"),
    nextHealthy: isDevelopment || serviceChildren.has("next"),
    migrationsHealthy: true,
    identityPreserved: currentIdentity.equals(backupIdentity),
  });
  await writeFile(path.join(runtime.dataRoot, "last-successful-update.json"), `${JSON.stringify({
    schemaVersion: 1,
    sourceVersion: pending.sourceVersion,
    targetVersion: pending.targetVersion,
    backupName: pending.backupName,
    validatedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  await reportDesktopUpdate("installed", pending.targetVersion, "startup_health_verified");
  await unlink(pending.pendingPath);
  runtime.pendingUpdate = null;
  await log("info", "Actualización validada después del primer inicio", `version=${runtime.appVersion}`);
}

function spawnService(name, command, args, options = {}) {
  const child = spawn(command, args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  children.add(child);
  serviceChildren.set(name, child);
  child.stdout?.on("data", (chunk) => void log("info", `[${name}]`, chunk));
  child.stderr?.on("data", (chunk) => void log("warn", `[${name}]`, chunk));
  child.once("error", (error) => void log("error", `${name} no pudo iniciar`, error.message));
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (serviceChildren.get(name) === child) serviceChildren.delete(name);
    void log(code === 0 || shuttingDown ? "info" : "error", `${name} finalizo`, `code=${code} signal=${signal}`);
  });
  return child;
}

async function startPocketBase() {
  if (!existsSync(runtime.pocketBaseExe)) {
    throw new Error(`No se encontro PocketBase local en ${runtime.pocketBaseExe}. Ejecute npm run desktop:prepare-pocketbase.`);
  }
  spawnService(
    "pocketbase",
    runtime.pocketBaseExe,
    [
      "serve",
      `--http=127.0.0.1:${runtime.pocketBasePort}`,
      `--dir=${runtime.pocketBaseDataDir}`,
      `--migrationsDir=${runtime.migrationsDir}`,
      `--hooksDir=${runtime.hooksDir}`,
    ],
    { cwd: path.dirname(runtime.pocketBaseExe) },
  );
  await waitForHealth(`${runtime.pocketBaseUrl}/api/health`);
}

async function ensureLocalSuperuser() {
  const email = "desktop-admin@local.invalid";
  let password = await readEncryptedSecret("local-superuser-password");
  if (!password) {
    password = randomBytes(36).toString("base64url");
    await writeEncryptedSecret("local-superuser-password", password);
  }
  await new Promise((resolve, reject) => {
    const child = spawn(runtime.pocketBaseExe, [
      "superuser",
      "upsert",
      email,
      password,
      `--dir=${runtime.pocketBaseDataDir}`,
      `--migrationsDir=${runtime.migrationsDir}`,
      `--hooksDir=${runtime.hooksDir}`,
    ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`No se pudo preparar el acceso técnico local: ${sanitizeLog(stderr)}`)));
  });
  runtime.localAdminEmail = email;
  runtime.localAdminPassword = password;
}

async function authenticateLocalSuperuser() {
  const response = await fetch(`${runtime.pocketBaseUrl}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: runtime.localAdminEmail, password: runtime.localAdminPassword }),
    signal: AbortSignal.timeout(5_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) throw new Error("No se pudo autenticar el acceso técnico local.");
  localAdminToken = data.token;
  return localAdminToken;
}

async function localSuperuserRequest(pathname, options = {}, retried = false) {
  const token = localAdminToken || await authenticateLocalSuperuser();
  const response = await fetch(`${runtime.pocketBaseUrl}${pathname}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (!retried && (response.status === 401 || response.status === 403)) {
    localAdminToken = "";
    return localSuperuserRequest(pathname, options, true);
  }
  return response;
}

async function localUserExists(id) {
  const response = await localSuperuserRequest(`/api/collections/users/records/${encodeURIComponent(id)}`);
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`No se pudo comprobar el usuario local: HTTP ${response.status}.`);
  return true;
}

async function upsertLocalSystemSetting(input) {
  const setting = normalizeLocalSystemSetting(input);
  const collectionPath = "/api/collections/system_settings/records";
  const recordPath = `${collectionPath}/${encodeURIComponent(setting.id)}`;
  const existing = await localSuperuserRequest(recordPath);
  if (!existing.ok && existing.status !== 404) {
    throw new Error(`No se pudo comprobar la configuración local: HTTP ${existing.status}.`);
  }

  const create = existing.status === 404;
  const response = await localSuperuserRequest(create ? collectionPath : recordPath, {
    method: create ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(create ? setting : { key: setting.key, value: setting.value }),
  });
  if (!response.ok) {
    throw new Error(`No se pudo guardar la configuración local: HTTP ${response.status}.`);
  }
  return true;
}

async function startNextServer() {
  if (isDevelopment) {
    await waitForHealth(runtime.rendererUrl, 90_000, 15_000);
    return;
  }
  if (!existsSync(runtime.nextServer)) throw new Error(`No se encontro el servidor standalone en ${runtime.nextServer}.`);
  spawnService("next", process.execPath, [runtime.nextServer], {
    cwd: path.dirname(runtime.nextServer),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(runtime.nextPort),
      NEXT_PUBLIC_POCKETBASE_URL: runtime.pocketBaseUrl,
      POCKETBASE_URL: runtime.pocketBaseUrl,
      POCKETBASE_ADMIN_EMAIL: runtime.localAdminEmail,
      POCKETBASE_ADMIN_PASSWORD: runtime.localAdminPassword,
      DESKTOP_RUNTIME: "1",
      DESKTOP_DEVICE_ID: runtime.deviceId,
    },
  });
  await waitForHealth(runtime.rendererUrl, 90_000, 15_000);
}

function publicRuntime() {
  return {
    appVersion: runtime.appVersion,
    isDesktop: true,
    isDevelopment: runtime.isDevelopment,
    pocketBaseUrl: runtime.pocketBaseUrl,
    centralUrl: runtime.centralUrl,
    deviceId: runtime.deviceId,
    deviceCode: runtime.deviceCode,
  };
}

function secretPath(key) {
  if (!/^[a-z0-9_-]{1,80}$/i.test(key)) throw new Error("Nombre de secreto invalido.");
  return path.join(runtime.secretsDir, `${key}.bin`);
}

async function writeEncryptedSecret(key, value) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows no ofrece almacenamiento cifrado para esta sesion.");
  await writeFile(secretPath(key), safeStorage.encryptString(String(value)));
}

async function readEncryptedSecret(key) {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(await readFile(secretPath(key)));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function deleteEncryptedSecret(key) {
  await unlink(secretPath(key)).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}

async function resolveDesktopCentralConfiguration() {
  const activationSecret = await readEncryptedSecret("desktop-activation");
  const resolved = resolveDesktopCentralUrl({
    configuredUrl: runtime.configuredCentralUrl,
    activationSecret,
    allowLocal: isDevelopment,
  });
  if (resolved) runtime.centralUrl = resolved.url;
  return resolved;
}

function validatedEndpoint(value) {
  const endpoint = new URL(String(value || "").trim());
  const local = endpoint.hostname === "127.0.0.1" || endpoint.hostname === "localhost";
  if (endpoint.protocol !== "https:" && !(isDevelopment && local)) {
    throw new Error("El servidor central debe usar HTTPS.");
  }
  endpoint.pathname = endpoint.pathname.replace(/\/+$/, "");
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint.toString().replace(/\/+$/, "");
}

function updateRequestHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "x-consultorio-device-id": runtime.deviceId,
  };
}

function setDesktopUpdateState(next) {
  updateState = publicDesktopUpdateState({ ...updateState, ...next });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("desktop:update:state-changed", updateState);
  }
  return updateState;
}

async function reportDesktopUpdate(status, version, code) {
  const token = await readEncryptedSecret("central-auth-token");
  const central = await resolveDesktopCentralConfiguration();
  if (!token || !central) return;
  const baseUrl = central.url;
  const report = {
    status,
    installedVersion: runtime.appVersion,
    ...(typeof version === "string" && version ? { updateVersion: version } : {}),
    code,
  };
  await fetch(`${baseUrl}/api/desktop-updates/v1/report`, {
    method: "POST",
    headers: { ...updateRequestHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(report),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => undefined);
}

async function loadDesktopUpdatePublicKeys() {
  const file = path.join(desktopDir, "generated", "update-public-keys.json");
  return validateDesktopUpdatePublicKeys(JSON.parse(await readFile(file, "utf8")));
}

async function fetchDesktopUpdateMetadata(file, token) {
  if (!currentUpdateFeedUrl || !["release-manifest.json", "release-manifest.sig"].includes(file)) {
    throw new Error("Metadato de integridad no permitido.");
  }
  const response = await fetch(`${currentUpdateFeedUrl}/${file}`, {
    headers: updateRequestHeaders(token),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Metadato de integridad HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength < 1 || bytes.byteLength > 1024 * 1024) throw new Error("Tamaño de metadato de integridad inválido.");
  return bytes;
}

async function verifyDownloadedDesktopUpdate(info) {
  const token = await readEncryptedSecret("central-auth-token");
  if (!token || !info?.downloadedFile || !info?.version) throw new Error("Falta contexto para verificar la descarga.");
  const [manifestBytes, signatureBytes, publicKeys] = await Promise.all([
    fetchDesktopUpdateMetadata("release-manifest.json", token),
    fetchDesktopUpdateMetadata("release-manifest.sig", token),
    loadDesktopUpdatePublicKeys(),
  ]);
  const manifest = parseDesktopReleaseManifestJson(manifestBytes.toString("utf8"));
  if (manifest.version !== info.version || manifest.platform !== process.platform || manifest.arch !== process.arch) {
    throw new Error("El manifiesto firmado no coincide con la descarga o el equipo.");
  }
  if (!verifySignatureEnvelope(manifestBytes, signatureBytes.toString("utf8"), publicKeys)) {
    throw new Error("La firma Ed25519 del manifiesto no es válida.");
  }
  await verifyReleaseArtifactFile(manifest, info.downloadedFile);
  return {
    version: info.version,
    file: path.resolve(info.downloadedFile),
    verifiedAt: new Date().toISOString(),
    manifestSha512: createHash("sha512").update(manifestBytes).digest("base64"),
  };
}

async function handleDownloadedDesktopUpdate(info) {
  try {
    setDesktopUpdateState({ status: "downloading", version: info.version, percent: 100, code: "verifying_integrity" });
    verifiedDownloadedUpdate = await verifyDownloadedDesktopUpdate(info);
    const deferred = await readDesktopUpdateDeferral();
    if (shouldDeferDesktopUpdate({
      kind: updateKind,
      version: info.version,
      deferredVersion: deferred?.version,
      remindAt: deferred?.remindAt,
    })) {
      setDesktopUpdateState({ status: "postponed", version: info.version, percent: 100, code: "integrity_verified_deferred" });
      scheduleDesktopUpdateReminder(deferred.remindAt);
    } else {
      setDesktopUpdateState({ status: "ready", version: info.version, percent: 100, code: "integrity_verified" });
    }
    await reportDesktopUpdate("downloaded", info.version, "integrity_verified");
  } catch (error) {
    verifiedDownloadedUpdate = null;
    if (info?.downloadedFile) await unlink(info.downloadedFile).catch(() => undefined);
    await log("error", "Actualización descargada rechazada por integridad", error?.message || error);
    setDesktopUpdateState({ status: "error", version: info?.version || null, code: "integrity_failed" });
    await reportDesktopUpdate("error", info?.version, "integrity_failed");
  }
}

async function readDesktopUpdateDeferral() {
  try {
    const value = JSON.parse(await readFile(path.join(runtime.dataRoot, "update-reminder.json"), "utf8"));
    if (value?.schemaVersion !== 1 || typeof value.version !== "string" || typeof value.remindAt !== "string") return null;
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    await log("warn", "Recordatorio de actualización inválido");
    return null;
  }
}

function scheduleDesktopUpdateReminder(remindAt) {
  if (updateReminderTimeout) clearTimeout(updateReminderTimeout);
  const delay = Math.max(0, Math.min(Date.parse(remindAt) - Date.now(), 24 * 60 * 60 * 1000));
  updateReminderTimeout = setTimeout(() => {
    updateReminderTimeout = null;
    void unlink(path.join(runtime.dataRoot, "update-reminder.json")).catch(() => undefined);
    if (verifiedDownloadedUpdate && updateKind === "normal") {
      setDesktopUpdateState({ status: "ready", code: "reminder_due" });
    }
  }, delay);
  updateReminderTimeout.unref?.();
}

async function postponeDesktopUpdate() {
  if (updateKind !== "normal" || !verifiedDownloadedUpdate || updateState.version !== verifiedDownloadedUpdate.version) return updateState;
  const remindAt = nextDesktopUpdateReminderAt();
  await writeFile(path.join(runtime.dataRoot, "update-reminder.json"), `${JSON.stringify({
    schemaVersion: 1,
    version: verifiedDownloadedUpdate.version,
    remindAt,
  }, null, 2)}\n`, { flag: "w" });
  scheduleDesktopUpdateReminder(remindAt);
  const next = setDesktopUpdateState({ status: "postponed", code: "user_postponed" });
  void reportDesktopUpdate("postponed", next.version, "user_postponed");
  return next;
}

async function checkDesktopUpdates(reason = "manual") {
  if (!desktopAutoUpdater || updateCheckInFlight) return updateCheckInFlight || updateState;
  updateCheckInFlight = (async () => {
    const checkedAt = new Date().toISOString();
    setDesktopUpdateState({ status: "checking", checkedAt, code: null });
    await log("info", "Inicio de consulta de actualización", `reason=${reason}`);
    const central = await resolveDesktopCentralConfiguration();
    if (!central) {
      await log("warn", "Consulta de actualización omitida", `reason=${reason} code=configuration_required`);
      return setDesktopUpdateState({ status: "error", checkedAt, code: "configuration_required" });
    }
    const token = await readEncryptedSecret("central-auth-token");
    if (!token) {
      await log("warn", "Consulta de actualización omitida", `reason=${reason} code=auth_required source=${central.source}`);
      return setDesktopUpdateState({ status: "error", checkedAt, code: "auth_required" });
    }
    const baseUrl = central.url;
    const policyUrl = new URL(`${baseUrl}/api/desktop-updates/v1/policy`);
    policyUrl.searchParams.set("version", runtime.appVersion);
    policyUrl.searchParams.set("platform", process.platform);
    policyUrl.searchParams.set("arch", process.arch);
    policyUrl.searchParams.set("osRelease", os.release());
    const headers = updateRequestHeaders(token);
    const response = await fetch(policyUrl, { headers, signal: AbortSignal.timeout(20_000) });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      await log("warn", "Consulta de actualización rechazada", `reason=${reason} code=auth_required source=${central.source}`);
      return setDesktopUpdateState({ status: "error", checkedAt, code: "auth_required" });
    }
    if (!response.ok) throw new Error(`Política de actualización HTTP ${response.status}`);
    if (body?.evaluation?.status === "up-to-date") {
      updateKind = null;
      await log("info", "Consulta de actualización completada", `reason=${reason} result=up_to_date source=${central.source}`);
      return setDesktopUpdateState({ status: "idle", version: body.evaluation.version, kind: null, percent: null, checkedAt, code: "up_to_date" });
    }
    if (body?.evaluation?.status !== "available" || !["normal", "mandatory"].includes(body.evaluation.kind)) {
      throw new Error("El equipo o la versión no son compatibles con el release.");
    }

    updateKind = body.evaluation.kind;
    const version = String(body.evaluation.version || "");
    verifiedDownloadedUpdate = null;
    setDesktopUpdateState({ status: updateKind === "mandatory" ? "mandatory" : "available", version, kind: updateKind, percent: 0, code: null });
    desktopAutoUpdater.requestHeaders = headers;
    currentUpdateFeedUrl = validatedDesktopUpdateFeedUrl(body.feedUrl, baseUrl);
    desktopAutoUpdater.setFeedURL({
      provider: "generic",
      url: currentUpdateFeedUrl,
      requestHeaders: headers,
    });
    await log("info", "Consulta de actualización completada", `reason=${reason} result=available source=${central.source} version=${version} kind=${updateKind}`);
    await reportDesktopUpdate("available", version, updateKind);
    await desktopAutoUpdater.checkForUpdates();
    return updateState;
  })().catch(async (error) => {
    await log("warn", "No se pudo consultar la actualización", `reason=${reason} ${error?.message || error}`);
    return setDesktopUpdateState({ status: "error", code: "check_failed" });
  }).finally(() => {
    updateCheckInFlight = null;
  });
  return updateCheckInFlight;
}

async function initializeDesktopUpdater() {
  const enabled = shouldEnableDesktopUpdater({
    isPackaged: app.isPackaged,
    smokeTest: process.argv.includes("--smoke-test"),
    platform: process.platform,
    arch: process.arch,
  });
  if (!enabled) return;

  return initializeDesktopUpdaterWithoutBlocking(async () => {
    const updaterModule = await import("electron-updater");
    const autoUpdater = resolveElectronAutoUpdater(updaterModule);
    desktopAutoUpdater = autoUpdater;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.disableWebInstaller = true;
    autoUpdater.logger = {
      info: (message) => void log("info", "[updater]", message),
      warn: (message) => void log("warn", "[updater]", message),
      error: (message) => void log("error", "[updater]", message),
    };
    autoUpdater.on("checking-for-update", () => setDesktopUpdateState({ status: "checking" }));
    autoUpdater.on("update-available", (info) => setDesktopUpdateState({
      status: updateKind === "mandatory" ? "mandatory" : "available",
      version: info.version,
      kind: updateKind,
      percent: 0,
    }));
    autoUpdater.on("update-not-available", (info) => setDesktopUpdateState({ status: "idle", version: info.version, kind: null, percent: null, code: "up_to_date" }));
    autoUpdater.on("download-progress", (progress) => setDesktopUpdateState({ status: "downloading", percent: progress.percent }));
    autoUpdater.on("update-downloaded", (info) => void handleDownloadedDesktopUpdate(info));
    autoUpdater.on("error", (error) => {
      void log("error", "Fallo Electron Updater", error?.message || error);
      setDesktopUpdateState({ status: "error", code: "updater_failed" });
      void reportDesktopUpdate("error", updateState.version, "updater_failed");
    });

    updateInterval = setInterval(() => void checkDesktopUpdates("interval"), 6 * 60 * 60 * 1000);
    updateInterval.unref?.();
    await checkDesktopUpdates("startup");
  }, async (error) => {
    desktopAutoUpdater = null;
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = null;
    setDesktopUpdateState({ status: "error", code: "updater_initialization_failed" });
    await log("error", "Actualizador deshabilitado durante este inicio", error?.message || error);
  });
}

async function requestRendererMaintenance() {
  if (!mainWindow || mainWindow.isDestroyed()) throw new Error("La ventana principal no está disponible.");
  if (maintenanceWaiter) throw new Error("Ya existe una preparación de mantenimiento en curso.");
  const requestId = randomUUID();
  mainWindow.setEnabled(false);
  const response = new Promise((resolve) => {
    maintenanceWaiter = { requestId, resolve };
  });
  mainWindow.webContents.send("desktop:maintenance:prepare", requestId);
  const status = await waitWithTimeout(response, 60_000, "La sincronización no finalizó dentro del tiempo seguro.")
    .finally(() => { maintenanceWaiter = null; });
  if (!status?.ok) throw new Error("No se pudo finalizar ordenadamente la sincronización.");
  maintenanceBarrier = true;
  return status;
}

function releaseRendererMaintenance() {
  maintenanceBarrier = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("desktop:maintenance:release");
    mainWindow.setEnabled(true);
  }
}

async function restartMissingLocalServices() {
  localAdminToken = "";
  if (!serviceChildren.has("pocketbase")) {
    await startPocketBase();
    await authenticateLocalSuperuser();
  }
  if (!isDevelopment && !serviceChildren.has("next")) await startNextServer();
}

async function installVerifiedDesktopUpdate() {
  if (updateInstallInFlight) return updateInstallInFlight;
  updateInstallInFlight = performVerifiedDesktopUpdateInstall().finally(() => { updateInstallInFlight = null; });
  return updateInstallInFlight;
}

async function performVerifiedDesktopUpdateInstall() {
  if (
    !desktopAutoUpdater
    || !verifiedDownloadedUpdate
    || !["ready", "postponed"].includes(updateState.status)
    || updateState.version !== verifiedDownloadedUpdate.version
  ) throw new Error("No existe una actualización verificada lista para instalar.");

  let servicesStopped = false;
  try {
    const syncStatus = await requestRendererMaintenance();
    await stopManagedServices(serviceChildren, 15_000);
    servicesStopped = true;
    const backup = await createVerifiedDesktopBackup({
      dataRoot: runtime.dataRoot,
      sourceVersion: runtime.appVersion,
      targetVersion: verifiedDownloadedUpdate.version,
      technicalState: { ...syncStatus, updateVersion: verifiedDownloadedUpdate.version },
      retention: 3,
    });
    await verifyDesktopBackup(backup.directory);
    const pending = {
      schemaVersion: 1,
      sourceVersion: runtime.appVersion,
      targetVersion: verifiedDownloadedUpdate.version,
      backupName: path.basename(backup.directory),
      preparedAt: new Date().toISOString(),
      manifestSha512: verifiedDownloadedUpdate.manifestSha512,
    };
    await writeFile(path.join(runtime.dataRoot, "pending-update.json"), `${JSON.stringify(pending, null, 2)}\n`, { flag: "w" });
    runtime.recoveryBackupPath = backup.directory;
    await reportDesktopUpdate("downloaded", verifiedDownloadedUpdate.version, "backup_verified");
    setDesktopUpdateState({ status: "ready", code: "installing_after_backup" });
    shuttingDown = true;
    desktopAutoUpdater.quitAndInstall(false, true);
    return { ok: true, backupDirectory: backup.directory };
  } catch (error) {
    shuttingDown = false;
    await unlink(path.join(runtime.dataRoot, "pending-update.json")).catch(() => undefined);
    await log("error", "Se abortó la instalación y se conserva la versión actual", error?.message || error);
    let runtimeRecovered = true;
    if (servicesStopped || !serviceChildren.has("next") || !serviceChildren.has("pocketbase")) {
      try {
        await restartMissingLocalServices();
      } catch (restartError) {
        runtimeRecovered = false;
        await log("error", "No se pudo restaurar un servicio local", restartError?.message || restartError);
      }
    }
    if (runtimeRecovered) releaseRendererMaintenance();
    else {
      maintenanceBarrier = true;
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setEnabled(true);
      await showStartupError(new Error("El respaldo se conservó, pero un servicio local no pudo reiniciarse."));
    }
    setDesktopUpdateState({ status: "error", code: "backup_or_shutdown_failed" });
    await reportDesktopUpdate("error", verifiedDownloadedUpdate?.version, "backup_or_shutdown_failed");
    throw new Error("No se instaló la actualización porque la preparación o el respaldo no pudieron verificarse.");
  }
}

function registerIpc() {
  ipcMain.on("desktop:runtime", (event) => {
    event.returnValue = publicRuntime();
  });
  ipcMain.handle("desktop:secret:set", async (_event, key, value) => {
    if (key !== "desktop-activation") throw new Error("Secreto no disponible para el renderer.");
    await writeEncryptedSecret(key, value);
    const central = await resolveDesktopCentralConfiguration();
    if (central && desktopAutoUpdater) void checkDesktopUpdates("activation");
    return true;
  });
  ipcMain.handle("desktop:secret:get", async (_event, key) => {
    if (key !== "desktop-activation") throw new Error("Secreto no disponible para el renderer.");
    return readEncryptedSecret(key);
  });
  ipcMain.handle("desktop:central:authenticate", async (_event, input) => {
    const pocketBaseUrl = validatedEndpoint(input?.pocketBaseUrl);
    const response = await fetch(`${pocketBaseUrl}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: String(input?.email || "").trim(), password: String(input?.password || "") }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token || !data.record?.id) {
      if (response.status >= 400 && response.status < 500) {
        await deleteEncryptedSecret("central-auth-token");
        return { ok: false, reason: "rejected" };
      }
      throw new Error("No se pudo validar el usuario contra el servidor central.");
    }
    await writeEncryptedSecret("central-auth-token", data.token);
    void checkDesktopUpdates("authenticated");
    return { ok: true, user: data.record, validatedAt: new Date().toISOString() };
  });
  ipcMain.handle("desktop:central:request", async (_event, input) => {
    const baseUrl = validatedEndpoint(input?.baseUrl);
    const requestPath = String(input?.path || "");
    if (!requestPath.startsWith("/api/desktop-sync/v1/")) throw new Error("Ruta central no permitida.");
    const token = await readEncryptedSecret("central-auth-token");
    if (!token) throw new Error("No hay una sesion central validada.");
    const response = await fetch(`${baseUrl}${requestPath}`, {
      method: String(input?.method || "POST").toUpperCase(),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-consultorio-device-id": runtime.deviceId,
      },
      body: input?.body === undefined ? undefined : JSON.stringify(input.body),
      signal: AbortSignal.timeout(30_000),
    });
    return { status: response.status, ok: response.ok, body: await response.json().catch(() => ({})) };
  });
  ipcMain.handle("desktop:local:user-exists", async (_event, input) => {
    const id = normalizeLocalUserId(input?.id);
    return localUserExists(id);
  });
  ipcMain.handle("desktop:local:upsert-system-setting", async (_event, input) => {
    return upsertLocalSystemSetting(input);
  });
  ipcMain.handle("desktop:secret:delete", async (_event, key) => {
    if (key !== "desktop-activation") throw new Error("Secreto no disponible para el renderer.");
    await deleteEncryptedSecret(key);
    return true;
  });
  ipcMain.handle("desktop:diagnostics:open", async () => shell.openPath(runtime.logsDir));
  ipcMain.handle("desktop:update:state", async () => updateState);
  ipcMain.handle("desktop:update:check", async () => checkDesktopUpdates("manual"));
  ipcMain.handle("desktop:update:postpone", async () => postponeDesktopUpdate());
  ipcMain.handle("desktop:update:install", async () => installVerifiedDesktopUpdate());
  ipcMain.handle("desktop:maintenance:ready", async (event, requestId, status) => {
    if (!mainWindow || event.sender !== mainWindow.webContents || !maintenanceWaiter || maintenanceWaiter.requestId !== requestId) return false;
    const normalized = {
      ok: status?.ok === true,
      pending: Number.isSafeInteger(status?.pending) && status.pending >= 0 ? status.pending : 0,
      errors: Number.isSafeInteger(status?.errors) && status.errors >= 0 ? status.errors : 0,
      conflicts: Number.isSafeInteger(status?.conflicts) && status.conflicts >= 0 ? status.conflicts : 0,
    };
    maintenanceWaiter.resolve(normalized);
    return true;
  });
  ipcMain.handle("desktop:diagnostics:export", async () => {
    const rawLog = await readFile(runtime.logPath, "utf8").catch(() => "");
    const report = {
      generatedAt: new Date().toISOString(),
      appVersion: runtime.appVersion,
      deviceCode: runtime.deviceCode,
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
      services: { pocketBase: "loopback", next: "loopback" },
      logTail: rawLog.split(/\r?\n/).slice(-200).map(sanitizeLog),
    };
    const reportPath = path.join(runtime.logsDir, `diagnostico-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    return reportPath;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: "#f5f7fb",
    webPreferences: {
      preload: path.join(desktopDir, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.session.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, (details, callback) => {
    if (!maintenanceBarrier || !["POST", "PUT", "PATCH", "DELETE"].includes(details.method)) return callback({ cancel: false });
    try {
      const target = new URL(details.url);
      const localHost = target.hostname === "127.0.0.1" || target.hostname === "localhost";
      const localPort = target.port === String(runtime.nextPort || 3000) || target.port === String(runtime.pocketBasePort);
      return callback({ cancel: localHost && localPort });
    } catch {
      return callback({ cancel: false });
    }
  });
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http://127.0.0.1:* https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        ],
      },
    });
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("close", (event) => {
    if (!shouldInstallMandatoryUpdateOnClose({
      kind: updateKind,
      verifiedVersion: verifiedDownloadedUpdate?.version,
      stateVersion: updateState.version,
      stateStatus: updateState.status,
      shuttingDown,
    })) return;
    event.preventDefault();
    void installVerifiedDesktopUpdate();
  });
  return mainWindow.loadURL(runtime.rendererUrl);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
}

async function showStartupError(error) {
  await log("error", "Fallo el inicio de la aplicacion", error?.stack || error?.message || error);
  const win = mainWindow || new BrowserWindow({ width: 760, height: 520, webPreferences: { sandbox: true } });
  const message = escapeHtml(error?.message || "Error desconocido");
  const logPath = escapeHtml(runtime?.logPath || "No disponible");
  const backupPath = escapeHtml(runtime?.recoveryBackupPath || "No disponible");
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Error de inicio</title><style>body{font:16px system-ui;margin:48px;color:#172033}code{display:block;padding:16px;background:#f2f4f8;border-radius:8px;white-space:pre-wrap}p{line-height:1.55}</style><h1>No se pudo iniciar Consultorio Oftalmologico</h1><p>La informacion clinica local no fue eliminada. La interfaz clinica permanecerá cerrada para evitar operar sobre una migración parcial.</p><code>${message}</code><p>Respaldo verificado: ${backupPath}</p><p>Registro de diagnostico: ${logPath}</p></html>`)}`);
  win.show();
}

async function shutdownChildren() {
  shuttingDown = true;
  await stopManagedServices(serviceChildren, 15_000).catch(async (error) => {
    await log("warn", "Cierre ordenado incompleto", error?.message || error);
    for (const child of children) child.kill();
  });
}

app.whenReady().then(async () => {
  try {
    await initializeRuntime();
    registerIpc();
    await log("info", "Inicio del runtime", `version=${runtime.appVersion} device=${runtime.deviceCode}`);
    await ensureLocalSuperuser();
    await startPocketBase();
    await startNextServer();
    await completePendingUpdateHealthCheck();
    if (process.argv.includes("--smoke-test")) {
      await log("info", "Smoke test del runtime completado");
      await shutdownChildren();
      app.quit();
      return;
    }
    await createMainWindow();
    await initializeDesktopUpdater();
  } catch (error) {
    await showStartupError(error);
  }
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", (event) => {
  if (updateInterval) clearInterval(updateInterval);
  if (updateReminderTimeout) clearTimeout(updateReminderTimeout);
  if (shuttingDown || children.size === 0) return;
  event.preventDefault();
  void shutdownChildren().finally(() => app.quit());
});
