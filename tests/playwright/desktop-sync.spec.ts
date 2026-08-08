import fs from "node:fs";
import { expect, test, type APIRequestContext } from "@playwright/test";

const DEMO_PASSWORD = "Consultorio123!";

test.describe("API de sincronización de escritorio", () => {
  test("autoriza equipo, confirma push idempotente, asigna ficha, detecta duplicado y avanza cursor", async ({ request }) => {
    const env = loadEnv(process.env.PLAYWRIGHT_ENV_FILE || ".env.test.local");
    const pbUrl = pocketBaseUrl(env);
    const adminToken = await authenticateSuperuser(request, pbUrl, env);
    const userAuth = await authenticateUser(request, pbUrl, "admin.demo@consultorio.local");
    const doctorAuth = await authenticateUser(request, pbUrl, "medico.demo@consultorio.local");
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toLowerCase();
    const deviceId = `playwright-device-${suffix}`;
    const deniedDeviceId = `denied-device-${suffix}`;
    const code = `PC-PW-${suffix.slice(-8)}`.toUpperCase();
    const normalizedCode = code.replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const recordId = pocketBaseId(`p${suffix}`);
    const duplicateId = pocketBaseId(`d${suffix}`);
    const operationId = `op-create-${suffix}`;
    const duplicateOperationId = `op-duplicate-${suffix}`;
    const document = `97${Date.now().toString().slice(-7)}`;
    const temporaryFicha = `TEMP-${code}-00001`;
    let conflictId = "";

    const unauthenticated = await request.post("/api/desktop-sync/v1/pull", {
      data: { deviceId, cursors: {} },
    });
    expect(unauthenticated.status()).toBe(401);

    try {
      const deniedActivation = await request.post("/api/desktop-sync/v1/activate", {
        headers: { Authorization: `Bearer ${doctorAuth.token}` },
        data: { deviceId: deniedDeviceId, code: `${code}-NO`, name: "No autorizado", appVersion: "0.1.0-test" },
      });
      expect(deniedActivation.status()).toBe(403);
      await expect(deniedActivation.json()).resolves.toMatchObject({ code: "device_enrollment_forbidden" });

      const activation = await request.post("/api/desktop-sync/v1/activate", {
        headers: { Authorization: `Bearer ${userAuth.token}` },
        data: { deviceId, code, name: "Playwright Desktop", appVersion: "0.1.0-test" },
      });
      expect(activation.status()).toBe(200);
      await expect(activation.json()).resolves.toMatchObject({
        device: { deviceId, code: normalizedCode, enabled: true },
        user: { id: userAuth.record.id },
        schemaVersion: 1,
      });

      const operation = {
        operationId,
        entity: "pacientes",
        recordId,
        action: "create",
        payload: {
          id: recordId,
          nombre: "PACIENTE",
          apellido: "SYNC PLAYWRIGHT",
          tipo_documento: "DNI",
          numero_documento: document,
          numero_ficha: temporaryFicha,
        },
        changedFields: ["nombre", "apellido", "tipo_documento", "numero_documento", "numero_ficha"],
        actorId: userAuth.record.id,
        deviceId,
        localCreatedAt: new Date().toISOString(),
        status: "pending",
        attempts: 0,
      };
      const headers = {
        Authorization: `Bearer ${userAuth.token}`,
        "x-consultorio-device-id": deviceId,
      };

      const firstPush = await request.post("/api/desktop-sync/v1/push", {
        headers,
        data: { deviceId, operations: [operation] },
      });
      expect(firstPush.status()).toBe(200);
      const firstBody = await firstPush.json();
      expect(firstBody.confirmations).toHaveLength(1);
      expect(firstBody.confirmations[0]).toMatchObject({
        operationId,
        status: "confirmed",
        recordId,
        temporaryFicha,
      });
      expect(firstBody.confirmations[0].definitiveFicha).toBeTruthy();
      expect(firstBody.confirmations[0].definitiveFicha).not.toBe(temporaryFicha);

      const repeatedPush = await request.post("/api/desktop-sync/v1/push", {
        headers,
        data: { deviceId, operations: [operation] },
      });
      expect(repeatedPush.status()).toBe(200);
      const repeatedBody = await repeatedPush.json();
      expect(repeatedBody.confirmations[0]).toEqual(firstBody.confirmations[0]);

      const duplicatePush = await request.post("/api/desktop-sync/v1/push", {
        headers,
        data: {
          deviceId,
          operations: [{ ...operation, operationId: duplicateOperationId, recordId: duplicateId, payload: { ...operation.payload, id: duplicateId } }],
        },
      });
      expect(duplicatePush.status()).toBe(200);
      const duplicateBody = await duplicatePush.json();
      expect(duplicateBody.confirmations[0]).toMatchObject({ status: "conflict", entity: "pacientes", recordId: duplicateId });
      conflictId = duplicateBody.confirmations[0].conflictId;
      expect(conflictId).toBeTruthy();

      const doctorConflicts = await request.get("/api/desktop-sync/v1/conflicts", {
        headers: {
          Authorization: `Bearer ${doctorAuth.token}`,
          "x-consultorio-device-id": deviceId,
        },
      });
      expect(doctorConflicts.status()).toBe(200);
      const doctorConflictBody = await doctorConflicts.json();
      expect((doctorConflictBody.items || []).some((item: { id?: string }) => item.id === conflictId)).toBe(false);

      const firstPull = await request.post("/api/desktop-sync/v1/pull", {
        headers,
        data: { deviceId, entities: ["pacientes"], cursors: {}, limit: 1 },
      });
      expect(firstPull.status()).toBe(200);
      const pullBody = await firstPull.json();
      expect(pullBody.pages).toHaveLength(1);
      expect(pullBody.pages[0]).toMatchObject({ entity: "pacientes" });
      expect(pullBody.pages[0].records.length).toBeLessThanOrEqual(1);
      if (pullBody.pages[0].cursor) {
        const secondPull = await request.post("/api/desktop-sync/v1/pull", {
          headers,
          data: { deviceId, entities: ["pacientes"], cursors: { pacientes: pullBody.pages[0].cursor }, limit: 1 },
        });
        expect(secondPull.status()).toBe(200);
        const secondBody = await secondPull.json();
        expect(secondBody.pages[0].cursor).not.toEqual(pullBody.pages[0].cursor);
      }
    } finally {
      await deleteWhere(request, pbUrl, adminToken, "sync_applied_operations", `operation_id = "${operationId}" || operation_id = "${duplicateOperationId}"`);
      if (conflictId) await deleteRecord(request, pbUrl, adminToken, "sync_conflicts", conflictId);
      await deleteRecord(request, pbUrl, adminToken, "pacientes", recordId);
      await deleteRecord(request, pbUrl, adminToken, "pacientes", duplicateId);
      await deleteWhere(request, pbUrl, adminToken, "sync_devices", `device_id = "${deviceId}"`);
    }
  });
});

async function authenticateSuperuser(request: APIRequestContext, baseUrl: string, env: Record<string, string>) {
  const data = { identity: env.POCKETBASE_ADMIN_EMAIL, password: env.POCKETBASE_ADMIN_PASSWORD };
  for (const path of ["/api/collections/_superusers/auth-with-password", "/api/admins/auth-with-password"]) {
    const response = await request.post(`${baseUrl}${path}`, { data });
    if (response.ok()) return (await response.json()).token as string;
  }
  throw new Error("No se pudo autenticar el superusuario de pruebas.");
}

async function authenticateUser(request: APIRequestContext, baseUrl: string, email: string) {
  const response = await request.post(`${baseUrl}/api/collections/users/auth-with-password`, {
    data: { identity: email, password: DEMO_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ token: string; record: { id: string } }>;
}

async function deleteWhere(request: APIRequestContext, baseUrl: string, token: string, collection: string, filter: string) {
  const response = await request.get(`${baseUrl}/api/collections/${collection}/records`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { page: 1, perPage: 200, filter },
  });
  if (!response.ok()) return;
  const result = await response.json();
  for (const item of result.items || []) await deleteRecord(request, baseUrl, token, collection, item.id);
}

async function deleteRecord(request: APIRequestContext, baseUrl: string, token: string, collection: string, id: string) {
  if (!id) return;
  await request.delete(`${baseUrl}/api/collections/${collection}/records/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function pocketBaseId(seed: string) {
  return seed.replace(/[^a-z0-9]/g, "").padEnd(15, "0").slice(0, 15);
}

function pocketBaseUrl(env: Record<string, string>) {
  const raw = (env.POCKETBASE_URL || env.NEXT_PUBLIC_POCKETBASE_URL || "").trim();
  if (!raw) throw new Error("Falta la URL de PocketBase de pruebas.");
  return (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, "");
}

function loadEnv(filePath: string) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value) result[key] = value;
  if (!fs.existsSync(filePath)) return result;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[trimmed.slice(0, index).trim()] = value;
  }
  return result;
}
