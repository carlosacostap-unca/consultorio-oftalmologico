"use client";

import type { RecordAuthResponse, RecordModel } from "pocketbase";
import { getDesktopRuntime } from "@/lib/desktop-runtime";
import { pb } from "@/lib/pocketbase";
import { localUserCreationError } from "@/lib/desktop-sync/client-error";
import { deriveLocalPassword } from "@/lib/desktop-sync/local-password";

const ACTIVATION_SECRET = "desktop-activation";
const BOOTSTRAP_ENTITIES = ["users", "mutuales", "settings", "pacientes", "consultas", "recetas"] as const;
type BootstrapEntity = (typeof BOOTSTRAP_ENTITIES)[number];

export interface DesktopActivationState {
  version: 1;
  centralAppUrl: string;
  centralPocketBaseUrl: string;
  userId: string;
  email: string;
  activatedAt?: string;
  lastValidatedAt: string;
  bootstrapCompleted: boolean;
}

export interface DesktopActivationInput {
  centralAppUrl: string;
  centralPocketBaseUrl: string;
  email: string;
  password: string;
  deviceName: string;
}

export async function loadDesktopActivation(): Promise<DesktopActivationState | null> {
  const bridge = window.consultorioDesktop;
  if (!bridge) return null;
  const raw = await bridge.secrets.get(ACTIVATION_SECRET);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DesktopActivationState;
  } catch {
    return null;
  }
}

export async function activateDesktop(
  input: DesktopActivationInput,
  onProgress?: (message: string) => void,
): Promise<DesktopActivationState> {
  const bridge = window.consultorioDesktop;
  const runtime = getDesktopRuntime();
  if (!bridge || !runtime) throw new Error("La activación sólo está disponible en la aplicación de escritorio.");

  const centralAppUrl = normalizeHttpsUrl(input.centralAppUrl);
  const centralPocketBaseUrl = normalizeHttpsUrl(input.centralPocketBaseUrl);
  onProgress?.("Validando usuario con el servidor central...");
  const auth = await bridge.central.authenticate({
    pocketBaseUrl: centralPocketBaseUrl,
    email: input.email.trim(),
    password: input.password,
  });

  onProgress?.("Registrando este equipo...");
  const activation = await desktopCentralRequest(centralAppUrl, "/api/desktop-sync/v1/activate", {
    deviceId: runtime.deviceId,
    code: runtime.deviceCode,
    name: input.deviceName.trim() || runtime.deviceCode,
    appVersion: runtime.appVersion,
  });
  const activatedUser = activation.user as Record<string, unknown> | undefined;
  if (!activatedUser?.id || String(activatedUser.id) !== auth.user.id) {
    throw new Error("El servidor central devolvió un usuario de activación inesperado.");
  }

  let state: DesktopActivationState = {
    version: 1,
    centralAppUrl,
    centralPocketBaseUrl,
    userId: auth.user.id,
    email: input.email.trim(),
    activatedAt: new Date().toISOString(),
    lastValidatedAt: auth.validatedAt,
    bootstrapCompleted: false,
  };
  await saveDesktopActivation(state);

  onProgress?.("Preparando el usuario local...");
  const users = await downloadBootstrapEntity(centralAppUrl, "users", onProgress);
  onProgress?.("Guardando el usuario local...");
  const localPassword = await deriveLocalPassword(input.password, runtime.deviceId);
  await prepareLocalUsers(users, auth.user.id, localPassword, input.password);

  for (const entity of BOOTSTRAP_ENTITIES.filter((value) => value !== "users")) {
    const items = await downloadBootstrapEntity(centralAppUrl, entity, onProgress);
    const localCollection = entity === "settings" ? "system_settings" : entity;
    onProgress?.(`Guardando ${labelForEntity(entity)} en la base local...`);
    for (const item of items) await upsertLocalRecord(localCollection, item);
  }

  state = { ...state, bootstrapCompleted: true };
  await saveDesktopActivation(state);
  onProgress?.("Activación y copia inicial completadas.");
  return state;
}

export async function desktopLoginWithPassword(
  email: string,
  password: string,
): Promise<{ authData: RecordAuthResponse<RecordModel>; offline: boolean }> {
  const state = await loadDesktopActivation();
  const runtime = getDesktopRuntime();
  const localPassword = state && runtime ? await deriveLocalPassword(password, runtime.deviceId) : password;
  const authData = await authenticateLocalUser(email.trim(), localPassword, password);
  if (!state) return { authData, offline: false };

  try {
    const result = await window.consultorioDesktop!.central.authenticate({
      pocketBaseUrl: state.centralPocketBaseUrl,
      email: email.trim(),
      password,
    });
    await saveDesktopActivation({ ...state, lastValidatedAt: result.validatedAt });
    return { authData, offline: false };
  } catch {
    return { authData, offline: true };
  }
}

async function downloadBootstrapEntity(
  baseUrl: string,
  entity: BootstrapEntity,
  onProgress?: (message: string) => void,
) {
  const items: Record<string, unknown>[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    onProgress?.(`Descargando ${labelForEntity(entity)} (${page}/${totalPages})...`);
    const result = await desktopCentralRequest(baseUrl, "/api/desktop-sync/v1/bootstrap", { entity, page, perPage: 200 });
    items.push(...((result.items as Record<string, unknown>[]) || []));
    totalPages = Math.max(1, Number(result.totalPages || 1));
    page += 1;
  } while (page <= totalPages);
  return items;
}

async function prepareLocalUsers(
  users: Record<string, unknown>[],
  currentUserId: string,
  localPassword: string,
  legacyPassword: string,
) {
  const current = users.find((user) => String(user.id || "") === currentUserId);
  if (!current) throw new Error("El usuario activado no fue incluido en la copia inicial.");
  await ensureLocalUser(current, localPassword, true, legacyPassword);
  await pb.collection("users").authWithPassword(String(current.email || ""), localPassword);

  for (const user of users) {
    if (String(user.id || "") === currentUserId) continue;
    await ensureLocalUser(user, `${crypto.randomUUID()}-${crypto.randomUUID()}`, false);
  }
}

async function ensureLocalUser(
  user: Record<string, unknown>,
  password: string,
  current: boolean,
  legacyPassword?: string,
) {
  const id = String(user.id || "");
  if (!id) return;

  if (current) {
    try {
      await authenticateLocalUser(String(user.email || ""), password, legacyPassword || password);
      return;
    } catch (error) {
      if (!isValidationError(error)) throw error;
    }
  }

  try {
    await pb.collection("users").getOne(id, { requestKey: null });
    return;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  try {
    await pb.collection("users").create(
      {
        ...sanitizeRecord(user),
        id,
        password,
        passwordConfirm: password,
        password_configured: current ? true : user.password_configured === true,
      },
      { headers: { "x-consultorio-sync-origin": "central" }, requestKey: null },
    );
  } catch (error) {
    throw localUserCreationError(error);
  }
}

async function authenticateLocalUser(email: string, localPassword: string, legacyPassword: string) {
  try {
    return await pb.collection("users").authWithPassword(email, localPassword);
  } catch (error) {
    if (localPassword === legacyPassword || !isValidationError(error)) throw error;
    const authData = await pb.collection("users").authWithPassword(email, legacyPassword);
    await pb.collection("users").update(authData.record.id, {
      password: localPassword,
      passwordConfirm: localPassword,
    });
    return authData;
  }
}

async function upsertLocalRecord(collection: string, item: Record<string, unknown>) {
  const id = String(item.id || "");
  if (!id) return;
  const payload = sanitizeRecord(item);
  const options = { headers: { "x-consultorio-sync-origin": "central" }, requestKey: null };
  try {
    await pb.collection(collection).getOne(id, { requestKey: null });
    await pb.collection(collection).update(id, payload, options);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await pb.collection(collection).create({ id, ...payload }, options);
  }
}

export async function desktopCentralRequest(
  baseUrl: string,
  path: `/api/desktop-sync/v1/${string}`,
  body?: unknown,
  method: "GET" | "POST" | "PATCH" = "POST",
) {
  const result = await window.consultorioDesktop!.central.request({ baseUrl, path, method, body });
  if (!result.ok) {
    const message = typeof result.body.error === "string" ? result.body.error : `El servidor central respondió HTTP ${result.status}.`;
    throw new Error(message);
  }
  return result.body;
}

async function saveDesktopActivation(state: DesktopActivationState) {
  await window.consultorioDesktop!.secrets.set(ACTIVATION_SECRET, JSON.stringify(state));
}

function sanitizeRecord(item: Record<string, unknown>) {
  const result = { ...item };
  for (const field of ["id", "collectionId", "collectionName", "created", "updated", "expand", "tokenKey", "passwordHash"]) {
    delete result[field];
  }
  return result;
}

function isNotFound(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 404);
}

function isValidationError(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 400);
}

function normalizeHttpsUrl(value: string) {
  const url = new URL(value.trim());
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(getDesktopRuntime()?.isDevelopment && local)) {
    throw new Error("Las direcciones centrales deben usar HTTPS.");
  }
  return url.toString().replace(/\/+$/, "");
}

function labelForEntity(entity: BootstrapEntity) {
  return ({ users: "usuarios", mutuales: "mutuales", settings: "configuración", pacientes: "pacientes", consultas: "consultas", recetas: "recetas" } as const)[entity];
}
