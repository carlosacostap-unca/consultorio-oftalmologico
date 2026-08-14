import assert from "node:assert/strict";
import test from "node:test";
import { createSingleFlightRunner, processInBatches, processPullEntities } from "./sync-runner.ts";
import type { SyncEntity, SyncPullPage } from "./types.ts";

test("dos sincronizaciones solicitadas a la vez comparten una única ejecución", async () => {
  let executions = 0;
  let release: (() => void) | undefined;
  const runner = createSingleFlightRunner(async () => {
    executions += 1;
    if (executions === 1) await new Promise<void>((resolve) => { release = resolve; });
    return executions;
  });

  const first = runner();
  const second = runner();
  assert.equal(first, second);
  assert.equal(executions, 0);

  await Promise.resolve();
  assert.equal(executions, 1);
  release?.();
  assert.equal(await first, 1);
  assert.equal(await runner(), 2);
});

test("un corte durante un lote conserva el fallo y no avanza al lote siguiente", async () => {
  const attempted: number[][] = [];
  const interrupted: number[][] = [];

  await assert.rejects(
    processInBatches(
      [1, 2, 3],
      2,
      async (batch) => {
        attempted.push(batch);
        throw new Error("conexión interrumpida");
      },
      async () => undefined,
      async (_error, batch) => { interrupted.push(batch); },
    ),
    /conexión interrumpida/,
  );

  assert.deepEqual(attempted, [[1, 2]]);
  assert.deepEqual(interrupted, [[1, 2]]);
});

test("procesa y aplica cada lote en orden estable", async () => {
  const applied: number[][] = [];
  await processInBatches(
    [1, 2, 3, 4, 5],
    2,
    async (batch) => batch.map((value) => value * 10),
    async (result) => { applied.push(result); },
  );
  assert.deepEqual(applied, [[10, 20], [30, 40], [50]]);
});

test("agota cada entidad antes de aplicar registros dependientes", async () => {
  const events: string[] = [];
  const pages = new Map<SyncEntity, SyncPullPage[]>([
    ["pacientes", [pullPage("pacientes", "p1", false)]],
    ["consultas", [pullPage("consultas", "c1", true), pullPage("consultas", "c2", false)]],
    ["recetas", [pullPage("recetas", "r1", false)]],
  ]);

  await processPullEntities(
    ["pacientes", "consultas", "recetas"],
    10,
    async (entity) => pages.get(entity)!.shift()!,
    async (entity, record) => { events.push(`record:${entity}:${record.id}`); },
    async (cursor) => { events.push(`cursor:${cursor.entity}:${cursor.id}`); },
  );

  assert.deepEqual(events, [
    "record:pacientes:p1",
    "cursor:pacientes:p1",
    "record:consultas:c1",
    "cursor:consultas:c1",
    "record:consultas:c2",
    "cursor:consultas:c2",
    "record:recetas:r1",
    "cursor:recetas:r1",
  ]);
});

test("no guarda el cursor de una página que falló al persistirse", async () => {
  const saved: string[] = [];
  await assert.rejects(
    processPullEntities(
      ["consultas"],
      2,
      async () => pullPage("consultas", "c1", false),
      async () => { throw new Error("relation missing"); },
      async (cursor) => { saved.push(cursor.id); },
    ),
    /relation missing/,
  );
  assert.deepEqual(saved, []);
});

function pullPage(entity: SyncEntity, id: string, hasMore: boolean): SyncPullPage {
  return {
    entity,
    records: [{ id }],
    cursor: { entity, updated: "2026-08-14T12:00:00.000Z", id },
    hasMore,
  };
}
