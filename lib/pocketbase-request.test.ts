import assert from "node:assert/strict";
import test from "node:test";
import PocketBase, { type SendOptions } from "pocketbase";
import {
  DESKTOP_CENTRAL_SYNC_ORIGIN,
  DESKTOP_SCOPE_MESSAGE,
  DESKTOP_SYNC_ORIGIN_HEADER,
} from "./desktop-scope.ts";
import { prepareDesktopPocketBaseRequest } from "./pocketbase-request.ts";

type CapturedRequest = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: string;
};

function createCapturingClient(responseBody: unknown) {
  const requests: CapturedRequest[] = [];
  const client = new PocketBase("http://127.0.0.1:8090");
  client.autoCancellation(false);
  client.beforeSend = (url, options) => prepareDesktopPocketBaseRequest(url, options, {
    deviceId: "device-test",
    actorId: "actor-test",
  });

  const fetchMock: typeof fetch = async (_input, init) => {
    requests.push(init || {});
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  return { client, fetchMock, requests };
}

test("serializa como JSON la autenticación local después de preparar las cabeceras", async () => {
  const { client, fetchMock, requests } = createCapturingClient({
    token: "token-test",
    record: { id: "user-test", collectionId: "_pb_users_auth_", collectionName: "users" },
  });

  await client.collection("users").authWithPassword("usuario@example.test", "password-test", { fetch: fetchMock });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].body, JSON.stringify({ identity: "usuario@example.test", password: "password-test" }));
  assert.equal(new Headers(requests[0].headers).get("content-type"), "application/json");
});

test("serializa como JSON la creación de un usuario local", async () => {
  const { client, fetchMock, requests } = createCapturingClient({
    id: "user-test",
    email: "usuario@example.test",
    collectionId: "_pb_users_auth_",
    collectionName: "users",
  });

  await client.collection("users").create(
    { id: "user-test", email: "usuario@example.test", password: "password-test", passwordConfirm: "password-test" },
    { fetch: fetchMock },
  );

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].body,
    JSON.stringify({
      id: "user-test",
      email: "usuario@example.test",
      password: "password-test",
      passwordConfirm: "password-test",
    }),
  );
});

test("devuelve cabeceras planas enumerables con dispositivo y actor", () => {
  const result = prepareDesktopPocketBaseRequest(
    "http://127.0.0.1:8090/api/collections/users/records",
    { method: "POST", headers: { "Content-Type": "application/json", "x-existing": "preserved" } },
    { deviceId: "device-test", actorId: "actor-test" },
  );
  const options = result.options as SendOptions;
  const headers = options.headers as Record<string, string>;

  assert.equal(Object.getPrototypeOf(headers), Object.prototype);
  assert.equal(Object.prototype.propertyIsEnumerable.call(headers, "content-type"), true);
  assert.deepEqual(headers, {
    "content-type": "application/json",
    "x-consultorio-actor-id": "actor-test",
    "x-consultorio-device-id": "device-test",
    "x-existing": "preserved",
  });
});

test("mantiene bloqueadas las escrituras fuera del alcance offline", () => {
  assert.throws(
    () => prepareDesktopPocketBaseRequest(
      "http://127.0.0.1:8090/api/collections/turnos/records",
      { method: "POST", headers: { "Content-Type": "application/json" } },
      { deviceId: "device-test" },
    ),
    new RegExp(DESKTOP_SCOPE_MESSAGE),
  );
});

test("permite altas y actualizaciones directas sólo de mutuales durante la copia inicial", () => {
  for (const method of ["POST", "PATCH"] as const) {
    const result = prepareDesktopPocketBaseRequest(
      "http://127.0.0.1:8090/api/collections/mutuales/records/record-test",
      {
        method,
        headers: {
          "Content-Type": "application/json",
          [DESKTOP_SYNC_ORIGIN_HEADER]: DESKTOP_CENTRAL_SYNC_ORIGIN,
        },
      },
      { deviceId: "device-test" },
    );

    const options = result.options as SendOptions;
    const headers = new Headers(options.headers);
    assert.equal(headers.get(DESKTOP_SYNC_ORIGIN_HEADER), DESKTOP_CENTRAL_SYNC_ORIGIN);
  }
});

test("mantiene acotada la excepción de copia inicial central", () => {
  const blockedRequests: Array<{ collection: string; method: string; origin?: string }> = [
    { collection: "mutuales", method: "POST" },
    { collection: "mutuales", method: "POST", origin: "CENTRAL" },
    { collection: "mutuales", method: "DELETE", origin: DESKTOP_CENTRAL_SYNC_ORIGIN },
    { collection: "system_settings", method: "PATCH", origin: DESKTOP_CENTRAL_SYNC_ORIGIN },
    { collection: "turnos", method: "POST", origin: DESKTOP_CENTRAL_SYNC_ORIGIN },
    { collection: "permissions", method: "PATCH", origin: DESKTOP_CENTRAL_SYNC_ORIGIN },
  ];

  for (const request of blockedRequests) {
    assert.throws(
      () => prepareDesktopPocketBaseRequest(
        `http://127.0.0.1:8090/api/collections/${request.collection}/records/record-test`,
        {
          method: request.method,
          headers: request.origin ? { [DESKTOP_SYNC_ORIGIN_HEADER]: request.origin } : undefined,
        },
        { deviceId: "device-test" },
      ),
      new RegExp(DESKTOP_SCOPE_MESSAGE),
      `${request.method} ${request.collection} (${request.origin || "sin origen"})`,
    );
  }
});
