import assert from "node:assert/strict";
import test from "node:test";
import { backupItems, downloadBackupResponse, listBackupResponse, type BackupDependencies } from "./service.ts";
import { signBackupDownload } from "./storage.ts";

process.env.POCKETBASE_URL = "https://pb.backup-test.invalid";
const file = "@auto_pb_backup_20260920030000.zip";
const settings = { cronMaxKeep: 30, s3: { enabled: true, endpoint: "s3.example.test", bucket: "clinical-backups", region: "us-east-1", forcePathStyle: true } };
function harness() {
  const calls = { settings: 0, list: 0, sign: [] as string[] };
  const deps: BackupDependencies = {
    isDesktop: false, authorize: async (request) => (await import("../pocketbase-admin.ts")).requireAdmin(request),
    settings: async () => { calls.settings++; return settings; },
    list: async () => { calls.list++; return [{ key: file, modified: "2026-09-20 03:01:00.000Z", size: 1024 }]; },
    downloadsEnabled: () => true,
    sign: async (_settings, key) => { calls.sign.push(key); return "https://s3.example.test/signed"; },
  };
  return { deps, calls };
}
function request(token = "admin", role = "admin", body?: unknown, user?: string) {
  return new Request("https://app.example.test/api/backups", {
    method: body === undefined ? "GET" : "POST",
    headers: { authorization: `Bearer ${token}`, "x-active-role": role, ...(user === undefined ? {} : { "x-backup-user-id": user }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("el backend revalida roles y sesiones antes de consultar o firmar", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    const token = new Headers(init.headers).get("authorization")?.replace("Bearer ", "");
    if (token === "expired") return Response.json({}, { status: 401 });
    return Response.json({ record: { id: token, roles: token === "admin" ? ["admin", "medico"] : [token] } });
  });
  for (const [token, role, user] of [["medico", "admin"], ["secretaria", "admin"], ["expired", "admin"], ["admin", "medico"], ["admin", ""], ["admin", "admin", "other-user"]]) {
    const { deps, calls } = harness();
    assert.equal((await listBackupResponse(request(token, role, undefined, user), deps)).status, 403);
    assert.equal((await downloadBackupResponse(request(token, role, { key: file }, user), deps)).status, 403);
    assert.deepEqual(calls, { settings: 0, list: 0, sign: [] });
  }
  const { deps, calls } = harness();
  const listing = await listBackupResponse(request(), deps);
  assert.equal(listing.status, 200);
  assert.equal(listing.headers.get("cache-control"), "no-store, private");
  const data = await listing.json();
  assert.deepEqual(Object.keys(data), ["items", "automaticLimit", "downloadsEnabled"]);
  assert.equal(data.items[0].automatic, true);
  assert.equal(data.automaticLimit, 30);
  assert.equal((await downloadBackupResponse(request("admin", "admin", { key: file }, "admin"), deps)).status, 200);
  assert.deepEqual(calls.sign, [file]);
});

test("rechaza rutas manipuladas, archivos eliminados y API local sin firmar", async () => {
  const { deps, calls } = harness();
  deps.authorize = async () => ({ id: "admin" });
  for (const key of ["../secret.zip", "folder/file.zip", "x\\file.zip", "x.zip\r\nHeader:x", "https://evil/x.zip", "x.txt", "%2e%2e.zip", "other.zip"]) {
    const response = await downloadBackupResponse(request("admin", "admin", { key }), deps);
    assert.equal(response.status, key === "other.zip" ? 404 : 400, key);
  }
  assert.deepEqual(calls.sign, []);
  deps.isDesktop = true;
  deps.authorize = async () => { throw new Error("No se debe autenticar contra la base local"); };
  assert.equal((await listBackupResponse(request(), deps)).status, 403);
});

test("listado sin credenciales, configuración ausente y errores no filtran secretos", async () => {
  const { deps } = harness();
  deps.authorize = async () => ({ id: "admin" });
  deps.downloadsEnabled = () => false;
  assert.equal((await (await listBackupResponse(request(), deps)).json()).downloadsEnabled, false);
  assert.equal((await downloadBackupResponse(request("admin", "admin", { key: file }), deps)).status, 503);
  deps.settings = async () => ({ s3: { enabled: false } });
  assert.equal((await listBackupResponse(request(), deps)).status, 503);
  deps.settings = async () => { throw new Error("S3_SECRET_OR_AUTH_TOKEN"); };
  const response = await listBackupResponse(request(), deps);
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes("S3_SECRET_OR_AUTH_TOKEN"), false);
});

test("conserva backups manuales antiguos y ordena por fecha sin confiar en campos extra", () => {
  const items = backupItems([
    { key: "manual.zip", modified: "2026-01-01 12:00:00Z", size: 5, secret: "hidden" },
    { key: file, modified: "2026-09-20 03:00:00Z", size: 8 },
    { key: "invalid.zip", modified: "invalid", size: 8 },
    { key: "bad.zip", modified: "2026-01-01", size: -1 },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0].key, file);
  assert.equal(items[1].automatic, false);
  assert.equal(JSON.stringify(items).includes("hidden"), false);
  assert.deepEqual(backupItems([]), []);
});

test("la firma limita objeto, vencimiento y nombre adjunto sin enviar bytes por el servidor", async () => {
  const url = new URL(await signBackupDownload(settings, file, { accessKeyId: "test-key", secretAccessKey: "test-secret" }));
  assert.equal(url.origin, "https://s3.example.test");
  assert.equal(decodeURIComponent(url.pathname), `/clinical-backups/${file}`);
  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  assert.equal(url.searchParams.get("response-content-disposition"), `attachment; filename="${file}"`);
  assert.equal(url.searchParams.get("response-content-type"), "application/zip");
  assert(url.searchParams.has("X-Amz-Signature"));
  assert(!url.href.includes("test-secret"));
  await assert.rejects(() => signBackupDownload({ s3: { ...settings.s3, endpoint: "http://s3.example.test" } }, file, { accessKeyId: "a", secretAccessKey: "b" }));
});
