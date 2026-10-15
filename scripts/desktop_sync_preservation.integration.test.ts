import assert from "node:assert/strict";
import test from "node:test";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { randomBytes, createHash } from "node:crypto";
import path from "node:path";
import { compatibleConflictResolution, persistConflictOnce } from "../lib/desktop-sync/conflict-storage.ts";
import { applyProtectedCentralRecord } from "../lib/desktop-sync/local-write-protection.ts";
import type { SyncRecord } from "../lib/desktop-sync/types.ts";

// Sólo usa una base nueva con datos sintéticos en loopback. Nunca carga .env.
test("PocketBase real conserva registros y colas durante recuperación de conflictos", { timeout: 90_000 }, async (t) => {
  await mkdir(path.resolve(".tmp"), { recursive: true });
  const root = await mkdtemp(path.resolve(".tmp/desktop-sync-preservation-"));
  const dataDir = path.join(root, "pb_data");
  const hooksDir = path.join(root, "pb_hooks");
  const migrationsDir = path.join(root, "pb_migrations");
  await Promise.all([mkdir(dataDir), mkdir(hooksDir), mkdir(migrationsDir)]);
  await cp(path.resolve("desktop/pocketbase/pb_hooks/sync_queue.pb.js"), path.join(hooksDir, "sync_queue.pb.js"));
  await cp(path.resolve("desktop/pocketbase/pb_hooks/sync_queue.js"), path.join(hooksDir, "sync_queue.js"));
  await cp(path.resolve("desktop/pocketbase/pb_migrations/1700000001_add_local_sync_state.js"), path.join(migrationsDir, "1700000001_add_local_sync_state.js"));
  const binary = path.resolve("desktop/pocketbase/pocketbase.exe");
  const password = randomBytes(24).toString("hex");
  const flags = ["--dir", dataDir, "--hooksDir", hooksDir, "--migrationsDir", migrationsDir];
  const setup = spawnSync(binary, ["superuser", "create", "fixture@example.invalid", password, ...flags], { windowsHide: true, encoding: "utf8" });
  assert.equal(setup.status, 0, "No pudo iniciar la base aislada");
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(binary, ["serve", "--http", `127.0.0.1:${port}`, ...flags], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  server.stdout.on("data", (data) => { logs += data; });
  server.stderr.on("data", (data) => { logs += data; });
  t.after(async () => {
    if (server.exitCode === null) { const exited = once(server, "exit"); server.kill(); await exited; }
  });
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null) throw new Error(`PocketBase aislado no inició: ${logs}`);
    if (await fetch(`${origin}/api/health`).then((r) => r.ok).catch(() => false)) break;
    if (attempt >= 100) throw new Error("PocketBase aislado no responde");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const authResponse = await fetch(`${origin}/api/collections/_superusers/auth-with-password`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "fixture@example.invalid", password }),
  });
  const auth = await authResponse.json();
  assert.equal(authResponse.status, 200);
  async function request(apiPath: string, method = "GET", body?: unknown, extraHeaders: Record<string, string> = {}) {
    const response = await fetch(origin + apiPath, { method,
      headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json", ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    const result = await response.json();
    if (!response.ok) throw { status: response.status, response: result };
    return result;
  }
  const text = (name: string, required = false) => ({ name, type: "text", required });
  const select = (name: string, values: string[], required = false) => ({ name, type: "select", values, maxSelect: 1, required });
  const json = (name: string) => ({ name, type: "json" });
  const date = (name: string) => ({ name, type: "autodate", onCreate: true, onUpdate: name === "updated" });
  for (const name of ["pacientes", "consultas", "recetas"]) {
    await request("/api/collections", "POST", { name, type: "base", fields: [
      text("texto"), text("sync_base_updated"), { name: "sync_deleted", type: "bool" }, date("created"), date("updated"),
    ] });
  }
  const currentFields = [text("operation_id", true), text("record_id", true), text("device_id", true), text("actor_id"),
    select("entity", ["pacientes", "consultas", "recetas"]), select("kind", ["concurrent_update", "possible_duplicate", "delete_conflict", "validation"]),
    select("status", ["open", "resolved", "discarded"]), json("base_snapshot"), json("local_snapshot"), json("central_snapshot"), json("conflicting_fields"), text("detected_at"),
    text("resolved_at"), text("resolved_by"), text("resolution"), text("resolution_note"), date("created"), date("updated")];
  const legacyFields = [select("entidad", ["pacientes", "consultas", "recetas"], true),
    select("tipo", ["duplicado_paciente", "version_concurrente", "dependencia_bloqueada", "validacion"], true),
    select("estado", ["abierto", "resuelto", "descartado"], true), text("local_record_id"), text("central_record_id"),
    text("device_key"), text("asignado_a"), json("local_payload"), json("central_payload"), json("campos")];
  await request("/api/collections", "POST", { name: "sync_conflicts", type: "base", fields: [...currentFields, ...legacyFields] });
  await request("/api/collections", "POST", { name: "modern_conflicts", type: "base", fields: currentFields });
  const centralHeaders = { "x-consultorio-sync-origin": "central" };
  const localHeaders = { "x-consultorio-actor-id": "actorfixture001", "x-consultorio-device-id": "devicefixture01" };
  const recordId = "consultfixture1";
  const recordPath = `/api/collections/consultas/records/${recordId}`;
  const central = await request("/api/collections/consultas/records", "POST", { id: recordId, texto: "versión central", sync_base_updated: "original" }, centralHeaders);
  const operation = { operationId: "operationfixture1", entity: "consultas" as const, recordId, actorId: "actorfixture001", deviceId: "devicefixture01" };
  const payload = { operation_id: operation.operationId, entity: operation.entity, record_id: recordId,
    actor_id: operation.actorId, device_id: operation.deviceId, kind: "concurrent_update", status: "open",
    base_snapshot: { texto: "versión base" }, local_snapshot: { id: recordId, texto: "versión local" },
    central_snapshot: central, conflicting_fields: ["texto"], detected_at: new Date().toISOString() };
  const storage = (collection: string) => ({
    find: async () => {
      const params = new URLSearchParams({ filter: `operation_id = "${operation.operationId}" && device_id = "${operation.deviceId}" && actor_id = "${operation.actorId}"` });
      return (await request(`/api/collections/${collection}/records?${params}`)).items[0] || null;
    },
    create: (data: SyncRecord) => request(`/api/collections/${collection}/records`, "POST", data),
  });

  await t.test("reproduce los tres campos vacíos y guarda ambas versiones sin modificar el registro", async () => {
    await assert.rejects(request("/api/collections/sync_conflicts/records", "POST", payload), (error: unknown) => {
      const e = error as { status: number; response: { data: Record<string, unknown> } };
      assert.equal(e.status, 400); assert.deepEqual(Object.keys(e.response.data).sort(), ["entidad", "estado", "tipo"]); return true;
    });
    const confirmation = await persistConflictOnce(operation, payload, storage("sync_conflicts"));
    const conflict = await request(`/api/collections/sync_conflicts/records/${confirmation.conflictId}`);
    assert.deepEqual(conflict.local_snapshot, payload.local_snapshot);
    assert.deepEqual(conflict.local_payload, payload.local_snapshot);
    assert.deepEqual(conflict.central_snapshot, central);
    assert.deepEqual(conflict.central_payload, central);
    assert.deepEqual(conflict.base_snapshot, payload.base_snapshot);
    assert.deepEqual(await request(recordPath), central);
    for (let retry = 0; retry < 5; retry++) {
      assert.deepEqual(await persistConflictOnce(operation, { ...payload, local_snapshot: { texto: "posterior" } }, storage("sync_conflicts")), confirmation);
    }
    assert.equal((await request("/api/collections/sync_conflicts/records")).totalItems, 1);
    assert.deepEqual(await request(`/api/collections/sync_conflicts/records/${confirmation.conflictId}`), conflict);
    const resolved = await request(`/api/collections/sync_conflicts/records/${confirmation.conflictId}`, "PATCH", compatibleConflictResolution({ resolution: "keep_central" }));
    assert.equal(resolved.estado, "resuelto"); assert.equal(resolved.status, "resolved");
    for (const field of ["base_snapshot", "local_snapshot", "central_snapshot", "local_payload", "central_payload"]) assert.deepEqual(resolved[field], conflict[field]);
    assert.deepEqual(await request(recordPath), central);
  });

  await t.test("un esquema exclusivamente actual admite la escritura compatible y la respuesta perdida", async () => {
    const modernStorage = storage("modern_conflicts");
    const saved = await persistConflictOnce(operation, payload, { ...modernStorage,
      create: async (data) => { await modernStorage.create(data); throw new Error("respuesta perdida"); } });
    assert.equal(saved.status, "conflict");
    assert.equal((await request("/api/collections/modern_conflicts/records")).totalItems, 1);
    assert.deepEqual(await request(recordPath), central);
  });

  await t.test("las ediciones y su cola son atómicas; el pull y una confirmación anterior no pisan cambios", async () => {
    const first = await request(recordPath, "PATCH", { texto: "primera edición local" }, { ...localHeaders, "x-consultorio-operation-id": "localoperation001" });
    const second = await request(recordPath, "PATCH", { texto: "segunda edición local" }, { ...localHeaders, "x-consultorio-operation-id": "localoperation002" });
    const queueBefore = await request("/api/collections/sync_operations/records?sort=operation_id");
    assert.equal(queueBefore.totalItems, 2);
    assert.equal(queueBefore.items[0].payload.texto, first.texto);
    assert.equal(queueBefore.items[1].payload.texto, second.texto);
    assert.equal(queueBefore.items[1].base_snapshot.texto, first.texto);
    // La unicidad de operation_id hace fallar la cola: el registro clínico debe hacer rollback.
    await assert.rejects(request(recordPath, "PATCH", { texto: "no debe quedar guardado" }, { ...localHeaders, "x-consultorio-operation-id": "localoperation002" }));
    assert.deepEqual(await request(recordPath), second);
    const write = async (_entity: unknown, record: SyncRecord, ack?: string) => {
      await request(recordPath, "PATCH", { texto: record.texto }, { ...centralHeaders,
        ...(ack ? { "x-consultorio-acknowledged-operation": ack } : {}) });
    };
    // Simula una edición entre la consulta del renderer y la transacción local.
    assert.equal(await applyProtectedCentralRecord("consultas", central, "localoperation001", { hasUnconfirmed: async () => false, write }), false);
    await assert.rejects(applyProtectedCentralRecord("consultas", central, undefined, { hasUnconfirmed: async () => false, write }));
    assert.deepEqual(await request(recordPath), second);
    assert.deepEqual(await request("/api/collections/sync_operations/records?sort=operation_id"), queueBefore);
    for (const status of ["sending", "error", "conflict"]) {
      for (const item of queueBefore.items) await request(`/api/collections/sync_operations/records/${item.id}`, "PATCH", { status });
      const protectedQueue = await request("/api/collections/sync_operations/records?sort=operation_id");
      await assert.rejects(write("consultas", central));
      assert.deepEqual(await request(recordPath), second);
      assert.deepEqual(await request("/api/collections/sync_operations/records?sort=operation_id"), protectedQueue);
    }
    for (const item of queueBefore.items) await request(`/api/collections/sync_operations/records/${item.id}`, "PATCH", { status: "confirmed" });
    await write("consultas", { texto: "versión reconciliada explícitamente" });
    assert.equal((await request(recordPath)).texto, "versión reconciliada explícitamente");
    const queueAfter = await request("/api/collections/sync_operations/records?sort=operation_id");
    assert.equal(queueAfter.totalItems, queueBefore.totalItems);
    for (let i = 0; i < 2; i++) assert.deepEqual(queueAfter.items[i].payload, queueBefore.items[i].payload);
    // Ni siquiera una escritura con origen central permite borrado físico.
    await assert.rejects(request(recordPath, "DELETE", undefined, centralHeaders));
    assert.equal((await request(recordPath)).id, recordId);
    for (let round = 0; round < 5; round++) {
      const operations = (await request("/api/collections/sync_operations/records")).items;
      for (const item of operations) await request(`/api/collections/sync_operations/records/${item.id}`, "PATCH", { status: "confirmed" });
      const results = await Promise.allSettled([
        request(recordPath, "PATCH", { texto: `edición local concurrente ${round}` }, { ...localHeaders, "x-consultorio-operation-id": `concurrentfixture${round}` }),
        write("consultas", { texto: `descarga central concurrente ${round}` }),
      ]);
      assert.equal(results[0].status, "fulfilled");
      assert.equal((await request(recordPath)).texto, `edición local concurrente ${round}`);
    }
    await writeFile(path.join(root, "verification.json"), JSON.stringify({ syntheticOnly: true,
      mixedSchemaRejectedOriginal: true, currentAndLegacySnapshotsPreserved: true,
      retriesWithoutDuplicate: 5, queuedOperationsPreserved: 2,
      concurrentLocalWriteProtected: true, realConcurrentWrites: 5, queueFailureRolledBack: true, physicalDeleteBlocked: true,
      originalCentralSha256: createHash("sha256").update(JSON.stringify(central)).digest("hex") }, null, 2));
  });

  await t.test("un alta offline sin cola durable hace rollback conservando el alta anterior", async () => {
    const patient = await request("/api/collections/pacientes/records", "POST", { id: "patientfixture1", texto: "alta local" },
      { ...localHeaders, "x-consultorio-operation-id": "patientoperation1" });
    await assert.rejects(request("/api/collections/pacientes/records", "POST", { id: "patientfixture2", texto: "no debe persistir sin cola" },
      { ...localHeaders, "x-consultorio-operation-id": "patientoperation1" }));
    assert.deepEqual(await request("/api/collections/pacientes/records/patientfixture1"), patient);
    await assert.rejects(request("/api/collections/pacientes/records/patientfixture2"));
    const operations = await request('/api/collections/sync_operations/records?filter=entity%3D%22pacientes%22');
    assert.equal(operations.totalItems, 1);
    assert.deepEqual(operations.items[0].payload, patient);
  });
});
