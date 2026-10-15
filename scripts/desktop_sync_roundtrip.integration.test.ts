import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import path from "node:path";
import { createRequire, type ResolveHookContext, type ResolveFnOutput } from "node:module";
import type { ConsultorioDesktopBridge } from "../lib/desktop-runtime";
import type { SyncEntity, SyncRecord } from "../lib/desktop-sync/types";

// No carga .env ni usa el respaldo del cliente. Incluso un fetch accidental a
// otro destino falla: las únicas bases autorizadas son estas dos nuevas.
async function startSyntheticPocketBase(t: TestContext, root: string, local: boolean) {
  const data = path.join(root, local ? "local" : "central");
  const hooks = path.join(data, "pb_hooks");
  const migrations = path.join(data, "pb_migrations");
  await Promise.all([mkdir(hooks, { recursive: true }), mkdir(migrations, { recursive: true })]);
  if (local) {
    for (const file of ["sync_queue.pb.js", "sync_queue.js"]) {
      await cp(path.resolve("desktop/pocketbase/pb_hooks", file), path.join(hooks, file));
    }
    await cp(path.resolve("desktop/pocketbase/pb_migrations/1700000001_add_local_sync_state.js"), path.join(migrations, "1700000001_add_local_sync_state.js"));
  }
  const binary = path.resolve("desktop/pocketbase/pocketbase.exe");
  const password = randomBytes(24).toString("hex");
  const flags = ["--dir", path.join(data, "pb_data"), "--hooksDir", hooks, "--migrationsDir", migrations];
  const setup = spawnSync(binary, ["superuser", "create", "fixture@example.invalid", password, ...flags], { windowsHide: true, encoding: "utf8" });
  assert.equal(setup.status, 0, "No pudo preparar PocketBase sintético");
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(binary, ["serve", "--http", `127.0.0.1:${port}`, ...flags], { windowsHide: true, stdio: "ignore" });
  t.after(async () => {
    if (server.exitCode === null) { const exited = once(server, "exit"); server.kill(); await exited; }
  });
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null) throw new Error("PocketBase sintético terminó antes de iniciar");
    if (await fetch(`${origin}/api/health`).then((r) => r.ok).catch(() => false)) break;
    if (attempt >= 100) throw new Error("PocketBase sintético no responde");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const login = await fetch(`${origin}/api/collections/_superusers/auth-with-password`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "fixture@example.invalid", password }),
  });
  assert.equal(login.status, 200);
  const admin = await login.json();
  async function request(apiPath: string, method = "GET", body?: unknown): Promise<SyncRecord> {
    const response = await fetch(origin + apiPath, { method,
      headers: { Authorization: `Bearer ${admin.token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    const result = await response.json();
    assert.equal(response.ok, true, `PocketBase sintético ${method} ${apiPath}: ${JSON.stringify(result)}`);
    return result;
  }
  return { origin, request, admin };
}

const text = (name: string) => ({ name, type: "text" });
const json = (name: string) => ({ name, type: "json" });
const select = (name: string, values: string[], required = false) => ({ name, type: "select", values, maxSelect: 1, required });
const date = (name: string) => ({ name, type: "autodate", onCreate: true, onUpdate: name === "updated" });

test("motor Windows y endpoints reales sincronizan dos bases aisladas sin perder datos", { timeout: 90_000 }, async (t) => {
  await mkdir(path.resolve(".tmp"), { recursive: true });
  const root = await mkdtemp(path.resolve(".tmp/desktop-sync-roundtrip-"));
  const central = await startSyntheticPocketBase(t, root, false);
  const local = await startSyntheticPocketBase(t, root, true);
  const nativeFetch = globalThis.fetch;
  let failAppliedWrite = false;
  const allowedOrigins = new Set([central.origin, local.origin]);
  let apiOrigin = central.origin;
  const packagedServerRoot = process.env.SYNC_PILOT_PACKAGED_SERVER;
  if (packagedServerRoot) {
    assert.ok(path.isAbsolute(packagedServerRoot), "La ruta del servidor empaquetado debe ser absoluta");
    // Este proxy sólo reenvía al PocketBase sintético. Permite interrumpir el
    // ledger del proceso empaquetado sin sustituir ninguno de sus handlers.
    const proxy = createHttpServer(async (request, response) => {
      try {
        if (failAppliedWrite && request.url === "/api/collections/sync_applied_operations/records" && request.method === "POST") {
          failAppliedWrite = false;
          response.writeHead(503, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ message: "Interrupción sintética del ledger" }));
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const forwarded = await nativeFetch(central.origin + request.url, { method: request.method,
          headers: { Authorization: request.headers.authorization || "", "Content-Type": "application/json" },
          body: ["GET", "HEAD"].includes(request.method || "GET") ? undefined : Buffer.concat(chunks),
        });
        response.writeHead(forwarded.status, { "Content-Type": "application/json" });
        response.end(Buffer.from(await forwarded.arrayBuffer()));
      } catch {
        response.writeHead(502); response.end();
      }
    });
    proxy.listen(0, "127.0.0.1");
    await once(proxy, "listening");
    const proxyOrigin = `http://127.0.0.1:${(proxy.address() as { port: number }).port}`;
    t.after(async () => { proxy.closeAllConnections(); await new Promise<void>((resolve) => proxy.close(() => resolve())); });
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = (reservation.address() as { port: number }).port;
    await new Promise<void>((resolve) => reservation.close(() => resolve()));
    apiOrigin = `http://127.0.0.1:${port}`;
    allowedOrigins.add(apiOrigin);
    const environment: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value && /^(?:systemroot|windir|path|pathext|temp|tmp|appdata|localappdata|userprofile|comspec)$/i.test(key)) environment[key] = value;
    }
    const server = spawn(process.execPath, [path.join(packagedServerRoot, "server.js")], { cwd: packagedServerRoot,
      windowsHide: true, stdio: "ignore", env: { ...environment, HOSTNAME: "127.0.0.1", PORT: String(port),
        POCKETBASE_URL: proxyOrigin, POCKETBASE_ADMIN_TOKEN: String(central.admin.token), DESKTOP_SYNC_ENABLED: "true", NODE_ENV: "production" } });
    t.after(async () => { if (server.exitCode === null) { const exited = once(server, "exit"); server.kill(); await exited; } });
    for (let attempt = 0; ; attempt++) {
      assert.equal(server.exitCode, null, "El servidor empaquetado terminó antes de iniciar");
      if (await nativeFetch(apiOrigin + "/api/desktop-sync/v1/conflicts").then((r) => r.status === 401).catch(() => false)) break;
      if (attempt >= 200) throw new Error("El servidor empaquetado no inició a tiempo");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  globalThis.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    assert.ok(allowedOrigins.has(new URL(url).origin), "La prueba prohíbe acceso fuera de las dos bases sintéticas");
    if (failAppliedWrite && new URL(url).pathname === "/api/collections/sync_applied_operations/records" && init?.method === "POST") {
      failAppliedWrite = false;
      throw new Error("Interrupción sintética después de guardar el registro y antes de guardar su confirmación");
    }
    return nativeFetch(input, init);
  };
  t.after(() => { globalThis.fetch = nativeFetch; });

  const rules = { listRule: "@request.auth.id != ''", viewRule: "@request.auth.id != ''", createRule: "@request.auth.id != ''", updateRule: "@request.auth.id != ''" };
  for (const db of [central, local]) {
    for (const entity of ["pacientes", "consultas", "recetas"] as const) {
      const collection = await db.request("/api/collections", "POST", { name: entity, type: "base", ...rules, fields: [
        ...["texto", "nombre", "apellido", "numero_ficha", "numero_documento", "tipo_documento", "estado_registro", "fecha_nacimiento", "paciente_id", "consulta_id", "medico_id", "sync_device_id", "sync_operation_id", "sync_base_updated", "sync_deleted_at", "sync_deleted_by", "sync_ficha_provisoria", "sync_ficha_definitiva"].map(text),
        { name: "sync_deleted", type: "bool" }, date("created"), date("updated"),
      ] });
      assert.equal(collection.name, entity);
    }
  }
  const userId = "actorsynthetic1";
  const deviceId = "synthetic-device-roundtrip";
  const userPassword = randomBytes(20).toString("hex");
  const usersSchema = await central.request("/api/collections/users");
  await central.request("/api/collections/users", "PATCH", { fields: [
    ...(usersSchema.fields as { name: string }[]).filter((field) => field.name !== "name" && field.name !== "role"),
    text("name"), select("role", ["admin", "medico"]),
  ] });
  await central.request("/api/collections/users/records", "POST", { id: userId, email: "actor@example.invalid", password: userPassword, passwordConfirm: userPassword, role: "admin", name: "Usuario ficticio" });
  const centralAuth = await central.request("/api/collections/users/auth-with-password", "POST", { identity: "actor@example.invalid", password: userPassword });
  await central.request("/api/collections", "POST", { name: "sync_devices", type: "base", fields: [
    ...["device_id", "device_key", "code", "activated_by", "last_seen_at", "ultimo_contacto_at", "last_sync_at"].map(text), { name: "enabled", type: "bool" },
  ] });
  await central.request("/api/collections/sync_devices/records", "POST", { device_id: deviceId, device_key: deviceId, code: "PC-FICTICIO", enabled: true, activated_by: userId });
  await central.request("/api/collections", "POST", { name: "sync_applied_operations", type: "base", fields: [
    ...["operation_id", "device_id", "entity", "record_id", "status", "actor_id", "applied_at"].map(text), json("result_json"),
  ], indexes: ["CREATE UNIQUE INDEX idx_fixture_applied ON sync_applied_operations (operation_id)"] });
  await central.request("/api/collections", "POST", { name: "sync_conflicts", type: "base", fields: [
    ...["operation_id", "entity", "record_id", "kind", "actor_id", "device_id", "status", "detected_at", "resolved_at", "resolved_by", "resolution", "resolution_note", "local_record_id", "central_record_id", "device_key", "asignado_a"].map(text),
    ...["base_snapshot", "local_snapshot", "central_snapshot", "conflicting_fields", "local_payload", "central_payload", "campos"].map(json),
    select("entidad", ["pacientes", "consultas", "recetas"], true), select("tipo", ["duplicado_paciente", "version_concurrente", "validacion"], true), select("estado", ["abierto", "resuelto", "descartado"], true),
  ] });
  await central.request("/api/collections", "POST", { name: "consulta_eventos", type: "base", fields: [
    ...["consulta_id", "paciente_id", "actor_id", "actor_nombre", "tipo", "titulo", "detalle"].map(text), json("metadata"),
  ] });

  const originalEnvironment = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries({ POCKETBASE_URL: central.origin, NEXT_PUBLIC_POCKETBASE_URL: central.origin, POCKETBASE_ADMIN_TOKEN: String(central.admin.token), DESKTOP_SYNC_ENABLED: "true" })) {
    originalEnvironment.set(key, process.env[key]); process.env[key] = value;
  }
  t.after(() => { for (const [key, value] of originalEnvironment) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  // Replica solamente el alias de Next para su marcador de frontera servidor.
  // El motor, los handlers y todas las escrituras siguen siendo los reales.
  // CI usa Node 22.22; el proyecto conserva @types/node 20 para su aplicación.
  const { registerHooks } = createRequire(import.meta.url)("node:module") as {
    registerHooks(hooks: { resolve: (specifier: string, context: ResolveHookContext,
      nextResolve: (specifier: string, context: ResolveHookContext) => ResolveFnOutput) => ResolveFnOutput }): { deregister(): void };
  };
  assert.equal(typeof registerHooks, "function", "El ensayo completo requiere Node.js 22.15 o superior");
  const serverBoundary = registerHooks({ resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "server-only" ? "next/dist/compiled/server-only/empty.js" : specifier, context);
  } });
  t.after(() => { serverBoundary.deregister(); });
  const pushRoute = await import("../app/api/desktop-sync/v1/push/route");
  const pullRoute = await import("../app/api/desktop-sync/v1/pull/route");
  const conflictRoute = await import("../app/api/desktop-sync/v1/conflicts/[id]/route");
  let loseResponse = false;
  let afterPush: (() => Promise<void>) | undefined;
  let online = true;
  let centralRequests = 0;
  const events = new EventTarget();
  const bridge = {
    runtime: { appVersion: "0.0.0-test", isDesktop: true, isDevelopment: true, pocketBaseUrl: local.origin, centralUrl: apiOrigin, deviceId, deviceCode: "PC-FICTICIO" },
    secrets: { get: async () => JSON.stringify({ bootstrapCompleted: true, centralAppUrl: apiOrigin }) },
    central: { request: async (input) => {
      centralRequests++;
      assert.equal(input.baseUrl, apiOrigin);
      const request = new Request(apiOrigin + input.path, { method: input.method || "POST",
        headers: { Authorization: `Bearer ${centralAuth.token}`, "x-consultorio-device-id": deviceId, "Content-Type": "application/json" }, body: JSON.stringify(input.body) });
      const response = packagedServerRoot ? await fetch(request) : input.path.endsWith("/push") ? await pushRoute.POST(request)
        : input.path.endsWith("/pull") ? await pullRoute.POST(request)
          : await conflictRoute.POST(request, { params: Promise.resolve({ id: input.path.split("/").at(-1)! }) });
      if (input.path.endsWith("/push")) {
        assert.equal(response.status, 200, await response.clone().text());
        if (afterPush) { const task = afterPush; afterPush = undefined; await task(); }
        if (loseResponse) { loseResponse = false; throw new Error("connection reset después de persistir el lote ficticio"); }
      }
      return { status: response.status, ok: response.ok, body: await response.json() };
    } },
  } satisfies Pick<ConsultorioDesktopBridge, "runtime"> & { central: Pick<ConsultorioDesktopBridge["central"], "request">; secrets: { get: () => Promise<string> } };
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { consultorioDesktop: bridge,
    dispatchEvent: events.dispatchEvent.bind(events), addEventListener: events.addEventListener.bind(events) } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { get onLine() { return online; } } });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator); else Reflect.deleteProperty(globalThis, "navigator");
  });
  const { pb } = await import("../lib/pocketbase");
  pb.authStore.save(String(local.admin.token), { ...local.admin.record, id: userId });
  const engine = await import("../lib/desktop-sync/engine");
  t.after(() => { pb.authStore.clear(); });
  const items = async (db: typeof local, collection: string) => (await db.request(`/api/collections/${collection}/records?sort=id&perPage=500`)).items as SyncRecord[];
  const queue = () => items(local, "sync_operations");
  const snapshot = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const seeded: Record<SyncEntity, string> = { pacientes: "patientseed0001", consultas: "consultseed0001", recetas: "recipeseed00001" };
  const created: Record<SyncEntity, string> = { pacientes: "patientlocal001", consultas: "consultlocal001", recetas: "recipelocal0001" };
  for (const id of [...Object.values(seeded), ...Object.values(created), userId]) assert.match(id, /^[a-z0-9]{15}$/);
  for (const entity of ["pacientes", "consultas", "recetas"] as const) {
    await central.request(`/api/collections/${entity}/records`, "POST", { id: seeded[entity], texto: `central ${entity}`, numero_ficha: entity === "pacientes" ? "100" : "", paciente_id: entity === "pacientes" ? "" : seeded.pacientes });
  }

  await t.test("descarga inicial y segunda sincronización vacía conservan datos sin crear cola", async () => {
    const status = await engine.runDesktopSync();
    assert.equal(status.phase, "caught_up", status.lastError);
    assert.equal(status.errors + status.conflicts + status.pending, 0);
    for (const entity of ["pacientes", "consultas", "recetas"] as const) assert.equal((await pb.collection(entity).getOne(seeded[entity])).texto, `central ${entity}`);
    const cursors = await items(local, "sync_cursors");
    assert.equal((await queue()).length, 0);
    assert.equal((await engine.runDesktopSync()).phase, "caught_up");
    assert.deepEqual(await items(local, "sync_cursors"), cursors);
    assert.equal((await queue()).length, 0);
  });

  await t.test("altas offline de paciente, consulta y receta se confirman con sus relaciones intactas", async () => {
    const before = snapshot(await items(central, "pacientes"));
    online = false;
    for (const entity of ["pacientes", "consultas", "recetas"] as const) await pb.collection(entity).create({
      id: created[entity], texto: `alta offline ${entity}`, numero_ficha: entity === "pacientes" ? "TEMP-FICTICIO" : "",
      paciente_id: entity === "pacientes" ? "" : created.pacientes, consulta_id: entity === "recetas" ? created.consultas : "",
    });
    const queued = await queue();
    assert.equal(queued.length, 3);
    assert.ok(queued.every((operation) => operation.status === "pending"));
    const requestCount = centralRequests;
    assert.equal((await engine.runDesktopSync()).connectivity, "offline");
    assert.equal(centralRequests, requestCount);
    assert.equal(snapshot(await items(central, "pacientes")), before);
    online = true;
    const status = await engine.runDesktopSync();
    assert.equal(status.phase, "caught_up", status.lastError);
    assert.equal(status.errors + status.conflicts + status.pending, 0);
    for (const entity of ["pacientes", "consultas", "recetas"] as const) {
      const record = await central.request(`/api/collections/${entity}/records/${created[entity]}`);
      assert.equal(record.texto, `alta offline ${entity}`);
      if (entity !== "pacientes") assert.equal(record.paciente_id, created.pacientes);
      if (entity === "recetas") assert.equal(record.consulta_id, created.consultas);
    }
    assert.equal((await pb.collection("pacientes").getOne(created.pacientes)).numero_ficha, "101");
    assert.equal((await queue()).length, queued.length);
    assert.ok((await queue()).every((operation) => operation.status === "confirmed"));
    for (const saved of queued) assert.deepEqual((await queue()).find((op) => op.id === saved.id)?.payload, saved.payload);
  });

  await t.test("ediciones normales de las tres entidades se sincronizan sin conflictos", async () => {
    for (const entity of ["pacientes", "consultas", "recetas"] as const) await pb.collection(entity).update(created[entity], { texto: `edición ${entity}` });
    const status = await engine.runDesktopSync();
    assert.equal(status.phase, "caught_up", status.lastError);
    assert.equal(status.errors + status.conflicts + status.pending, 0);
    for (const entity of ["pacientes", "consultas", "recetas"] as const) {
      assert.equal((await central.request(`/api/collections/${entity}/records/${created[entity]}`)).texto, `edición ${entity}`);
      assert.equal((await pb.collection(entity).getOne(created[entity])).texto, `edición ${entity}`);
    }
    assert.equal((await items(central, "sync_conflicts")).length, 0);
    assert.equal((await items(central, "sync_applied_operations")).length, 6);
  });

  await t.test("respuesta perdida después de guardar se reintenta con el mismo ID sin duplicar", async () => {
    await pb.collection("consultas").update(created.consultas, { texto: "edición con respuesta perdida" });
    const pending = (await queue()).find((op) => op.status === "pending")!;
    loseResponse = true;
    assert.equal((await engine.runDesktopSync()).phase, "error");
    assert.equal((await central.request(`/api/collections/consultas/records/${created.consultas}`)).texto, "edición con respuesta perdida");
    const centralBeforeRetry = await items(central, "sync_applied_operations");
    await pb.collection("sync_operations").update(String(pending.id), { next_attempt_at: "" });
    const status = await engine.runDesktopSync();
    assert.equal(status.phase, "caught_up", status.lastError);
    assert.equal(status.errors + status.conflicts + status.pending, 0);
    assert.deepEqual(await items(central, "sync_applied_operations"), centralBeforeRetry);
    const recovered = (await queue()).find((op) => op.id === pending.id)!;
    assert.equal(recovered.operation_id, pending.operation_id);
    assert.deepEqual(recovered.payload, pending.payload);
    assert.equal(recovered.status, "confirmed");
    assert.equal((await items(central, "consultas")).length, 2);
  });

  await t.test("un fallo del ledger tras guardar una edición no fabrica un conflicto al reintentar", async () => {
    await pb.collection("consultas").update(created.consultas, { texto: "edición guardada antes de interrumpir ledger" });
    const pending = (await queue()).find((op) => op.status === "pending")!;
    const previousConfirmations = await items(central, "sync_applied_operations");
    failAppliedWrite = true;
    const expectedLog = t.mock.method(console, "error", () => undefined);
    const failed = await engine.runDesktopSync();
    expectedLog.mock.restore();
    assert.equal(failed.phase, "error");
    assert.equal(failAppliedWrite, false);
    const saved = await central.request(`/api/collections/consultas/records/${created.consultas}`);
    assert.equal(saved.sync_operation_id, pending.operation_id);
    assert.equal(saved.texto, "edición guardada antes de interrumpir ledger");
    assert.deepEqual(await items(central, "sync_applied_operations"), previousConfirmations);
    await pb.collection("sync_operations").update(String(pending.id), { next_attempt_at: "" });
    const status = await engine.runDesktopSync();
    assert.equal(status.phase, "caught_up", status.lastError);
    assert.equal(status.errors + status.conflicts + status.pending, 0);
    assert.deepEqual(await central.request(`/api/collections/consultas/records/${created.consultas}`), saved);
    assert.equal((await items(central, "sync_applied_operations")).length, previousConfirmations.length + 1);
    assert.equal((await items(central, "sync_conflicts")).length, 0);
    assert.deepEqual((await queue()).find((op) => op.id === pending.id)?.payload, pending.payload);
  });

  await t.test("edición durante una confirmación se conserva; conflicto mixto guarda ambas versiones", async () => {
    await pb.collection("consultas").update(created.consultas, { texto: "primera edición antes de confirmar" });
    afterPush = async () => { await pb.collection("consultas").update(created.consultas, { texto: "segunda edición mientras llega la confirmación" }); };
    const cursors = await items(local, "sync_cursors");
    const status = await engine.runDesktopSync();
    assert.equal(status.phase, "error");
    assert.equal((await pb.collection("consultas").getOne(created.consultas)).texto, "segunda edición mientras llega la confirmación");
    assert.deepEqual(await items(local, "sync_cursors"), cursors);
    const pending = (await queue()).find((op) => op.status === "pending")!;
    assert.ok(pending);
    const retry = await engine.runDesktopSync();
    assert.equal(retry.conflicts, 1);
    const conflicts = await items(central, "sync_conflicts");
    assert.equal(conflicts.length, 1);
    const conflict = conflicts[0];
    assert.equal(conflict.local_snapshot && (conflict.local_snapshot as SyncRecord).texto, "segunda edición mientras llega la confirmación");
    assert.equal((conflict.central_snapshot as SyncRecord).texto, "primera edición antes de confirmar");
    assert.equal(conflict.entidad, "consultas"); assert.equal(conflict.estado, "abierto"); assert.equal(conflict.tipo, "version_concurrente");
    assert.deepEqual((await queue()).find((op) => op.id === pending.id)?.payload, pending.payload);
    await engine.runDesktopSync();
    assert.deepEqual(await items(central, "sync_conflicts"), conflicts);
    assert.equal((await pb.collection("consultas").getOne(created.consultas)).texto, "segunda edición mientras llega la confirmación");
    // Elección explícita únicamente sobre el conflicto ficticio de esta prueba.
    const localConflict = await pb.collection("sync_local_conflicts").getFirstListItem(`conflict_id = "${conflict.id}"`);
    await engine.resolveDesktopConflict(localConflict, "apply_local");
    const final = await engine.runDesktopSync();
    assert.equal(final.phase, "caught_up", final.lastError);
    assert.equal(final.errors + final.conflicts + final.pending, 0);
    const resolved = (await items(central, "sync_conflicts"))[0];
    assert.equal(resolved.status, "resolved"); assert.equal(resolved.estado, "resuelto");
    for (const key of ["base_snapshot", "local_snapshot", "central_snapshot", "local_payload", "central_payload"]) assert.deepEqual(resolved[key], conflict[key]);
    assert.equal((await central.request(`/api/collections/consultas/records/${created.consultas}`)).texto, "segunda edición mientras llega la confirmación");
    assert.ok((await queue()).every((op) => op.status === "confirmed"));
  });

  await t.test("baja lógica interrumpida se confirma sin borrar el registro ni repetir su escritura", async () => {
    const countsBefore = (await items(central, "recetas")).length;
    const previous = await pb.collection("recetas").getOne(created.recetas);
    await pb.collection("recetas").update(created.recetas, { sync_deleted: true });
    const pending = (await queue()).find((op) => op.status === "pending")!;
    assert.equal(pending.action, "delete");
    failAppliedWrite = true;
    const expectedLog = t.mock.method(console, "error", () => undefined);
    assert.equal((await engine.runDesktopSync()).phase, "error");
    expectedLog.mock.restore();
    assert.equal(failAppliedWrite, false);
    const deleted = await central.request(`/api/collections/recetas/records/${created.recetas}`);
    assert.equal(deleted.sync_deleted, true);
    assert.equal(deleted.texto, previous.texto);
    assert.equal(deleted.paciente_id, previous.paciente_id);
    assert.equal(deleted.consulta_id, previous.consulta_id);
    assert.equal(deleted.sync_operation_id, pending.operation_id);
    await pb.collection("sync_operations").update(String(pending.id), { next_attempt_at: "" });
    const status = await engine.runDesktopSync();
    assert.equal(status.phase, "caught_up", status.lastError);
    assert.equal(status.errors + status.conflicts + status.pending, 0);
    assert.deepEqual(await central.request(`/api/collections/recetas/records/${created.recetas}`), deleted);
    assert.equal((await items(central, "recetas")).length, countsBefore);
    const retained = await pb.collection("recetas").getOne(created.recetas);
    assert.equal(retained.sync_deleted, true);
    assert.equal(retained.texto, previous.texto);
    assert.equal(retained.paciente_id, previous.paciente_id);
    assert.deepEqual((await queue()).find((op) => op.id === pending.id)?.payload, pending.payload);
    assert.equal((await queue()).find((op) => op.id === pending.id)?.status, "confirmed");
  });
  await writeFile(path.join(root, "verification.json"), JSON.stringify({ syntheticOnly: true, realClientEngine: true, realPushPullAndResolutionHandlers: true,
    packagedServerOverHttp: Boolean(packagedServerRoot),
    separateLocalAndCentralDatabases: true, externalNetworkBlocked: true, normalCreateUpdateAllEntities: true,
    lostResponseRetry: true, ledgerInterruptionRetry: true, logicalDeletionPreservesRecords: true,
    editsDuringAcknowledgmentPreserved: true, mixedSchemaConflictAndExplicitResolution: true,
    retainedQueue: (await queue()).length, durableConfirmations: (await items(central, "sync_applied_operations")).length }, null, 2));
});
