import { app, BrowserWindow, ipcMain, safeStorage, shell } from "electron";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = !app.isPackaged;
const children = new Set();
let mainWindow = null;
let shuttingDown = false;
let runtime = null;

app.commandLine.appendSwitch("disable-features", "AutofillServerCommunication");

function sanitizeLog(value) {
  return String(value)
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

async function waitForHealth(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
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
    centralUrl: process.env.DESKTOP_CENTRAL_URL || process.env.NEXT_PUBLIC_APP_URL || "",
    deviceId: identity.deviceId,
    deviceCode: identity.deviceCode,
  };
}

function spawnService(name, command, args, options = {}) {
  const child = spawn(command, args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  children.add(child);
  child.stdout?.on("data", (chunk) => void log("info", `[${name}]`, chunk));
  child.stderr?.on("data", (chunk) => void log("warn", `[${name}]`, chunk));
  child.once("error", (error) => void log("error", `${name} no pudo iniciar`, error.message));
  child.once("exit", (code, signal) => {
    children.delete(child);
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

async function startNextServer() {
  if (isDevelopment) {
    await waitForHealth(runtime.rendererUrl);
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
  await waitForHealth(runtime.rendererUrl);
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

function registerIpc() {
  ipcMain.on("desktop:runtime", (event) => {
    event.returnValue = publicRuntime();
  });
  ipcMain.handle("desktop:secret:set", async (_event, key, value) => {
    if (key !== "desktop-activation") throw new Error("Secreto no disponible para el renderer.");
    await writeEncryptedSecret(key, value);
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
    if (!response.ok || !data.token || !data.record?.id) throw new Error("No se pudo validar el usuario contra el servidor central.");
    await writeEncryptedSecret("central-auth-token", data.token);
    return { user: data.record, validatedAt: new Date().toISOString() };
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
  ipcMain.handle("desktop:secret:delete", async (_event, key) => {
    if (key !== "desktop-activation") throw new Error("Secreto no disponible para el renderer.");
    const { unlink } = await import("node:fs/promises");
    await unlink(secretPath(key)).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
    return true;
  });
  ipcMain.handle("desktop:diagnostics:open", async () => shell.openPath(runtime.logsDir));
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
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Error de inicio</title><style>body{font:16px system-ui;margin:48px;color:#172033}code{display:block;padding:16px;background:#f2f4f8;border-radius:8px;white-space:pre-wrap}p{line-height:1.55}</style><h1>No se pudo iniciar Consultorio Oftalmologico</h1><p>La informacion clinica local no fue eliminada. Cierre la aplicacion, verifique que el instalador este completo e intentelo nuevamente.</p><code>${message}</code><p>Registro de diagnostico: ${logPath}</p></html>`)}`);
  win.show();
}

async function shutdownChildren() {
  shuttingDown = true;
  for (const child of children) child.kill();
  await new Promise((resolve) => setTimeout(resolve, 250));
}

app.whenReady().then(async () => {
  try {
    await initializeRuntime();
    registerIpc();
    await log("info", "Inicio del runtime", `version=${runtime.appVersion} device=${runtime.deviceCode}`);
    await ensureLocalSuperuser();
    await startPocketBase();
    await startNextServer();
    if (process.argv.includes("--smoke-test")) {
      await log("info", "Smoke test del runtime completado");
      await shutdownChildren();
      app.quit();
      return;
    }
    await createMainWindow();
  } catch (error) {
    await showStartupError(error);
  }
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", (event) => {
  if (shuttingDown || children.size === 0) return;
  event.preventDefault();
  void shutdownChildren().finally(() => app.quit());
});
