import assert from "node:assert/strict";
import test from "node:test";
import { requestCentralBackups } from "./backup-client.mjs";

const config = { pocketBaseUrl: "http://127.0.0.1:8090", centralUrl: "https://central.example.test", centralToken: "central-token" };
const input = { action: "list", activeRole: "admin", localToken: "local-token" };

test("sesión local no admin o ausente no reutiliza el token central de otro usuario", async () => {
  for (const record of [{ id: "secretary", roles: ["secretaria"] }, null]) {
    const calls = [];
    const result = await requestCentralBackups(input, { ...config, fetchImpl: async url => {
      calls.push(url);
      return Response.json({ record }, { status: record ? 200 : 401 });
    } });
    assert.equal(result.status, 403);
    assert.equal(calls.length, 1);
    assert(calls[0].startsWith(config.pocketBaseUrl));
  }
  const result = await requestCentralBackups({ ...input, activeRole: "medico" }, { ...config, fetchImpl: () => { throw new Error("No debe consultar"); } });
  assert.equal(result.status, 403);
});

test("rutas y origen fijos, token local no enviado a central y coincidencia de identidad verificable", async () => {
  const calls = [];
  const result = await requestCentralBackups({ ...input, action: "download", key: "backup.zip", baseUrl: "https://evil.test", path: "/api/settings" }, {
    ...config, fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1 ? Response.json({ record: { id: "current-admin", role: "admin" } }) : Response.json({ error: "Sesión de otro usuario" }, { status: 403 });
    },
  });
  assert.equal(result.status, 403);
  assert.equal(calls[1].url, "https://central.example.test/api/backups/download");
  assert.equal(calls[1].options.headers["x-backup-user-id"], "current-admin");
  assert.equal(calls[1].options.headers.Authorization, "Bearer central-token");
  assert.equal(calls[1].options.redirect, "error");
  assert.deepEqual(JSON.parse(calls[1].options.body), { key: "backup.zip" });
});
