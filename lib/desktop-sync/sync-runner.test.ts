import assert from "node:assert/strict";
import test from "node:test";
import { createSingleFlightRunner, isCursorAfter, processInBatches, processPullEntities } from "./sync-runner.ts";
import type { SyncCursor, SyncEntity, SyncPullPage } from "./types.ts";

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
    {},
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
      {},
      async () => pullPage("consultas", "c1", false),
      async () => { throw new Error("relation missing"); },
      async (cursor) => { saved.push(cursor.id); },
    ),
    /relation missing/,
  );
  assert.equal(saved.length, 0);
});

test("devuelve una continuación al agotar el tramo y reanuda desde el cursor durable", async () => {
  const saved: SyncCursor[] = [];
  const requested: Array<SyncCursor | null> = [];
  const pages = Array.from({ length: 101 }, (_, index) => {
    const id = String(index + 1).padStart(6, "0");
    return pullPage("consultas", id, index < 100);
  });

  const first = await processPullEntities(
    ["consultas"],
    100,
    {},
    async (_entity, cursor) => {
      requested.push(cursor);
      return pages.shift()!;
    },
    async () => undefined,
    async (cursor) => { saved.push(cursor); },
  );

  assert.deepEqual(first, {
    complete: false,
    entity: "consultas",
    pagesProcessed: 100,
    recordsProcessed: 100,
  });
  assert.equal(saved.at(-1)?.id, "000100");

  const second = await processPullEntities(
    ["consultas"],
    100,
    { consultas: saved.at(-1)! },
    async (_entity, cursor) => {
      requested.push(cursor);
      return pages.shift()!;
    },
    async () => undefined,
    async (cursor) => { saved.push(cursor); },
  );

  assert.equal(second.complete, true);
  assert.equal(requested.at(-1)?.id, "000100");
  assert.equal(saved.at(-1)?.id, "000101");
});

test("rechaza una página vacía que declara más resultados", async () => {
  await assert.rejects(
    processPullEntities(
      ["consultas"],
      2,
      {},
      async () => ({ entity: "consultas", records: [], cursor: null, hasMore: true }),
      async () => undefined,
      async () => undefined,
    ),
    /más resultados pero no contiene registros/,
  );
});

test("rechaza un cursor ausente o estancado sin guardarlo", async () => {
  const previous: SyncCursor = { entity: "consultas", updated: "2026-08-14T12:00:00.000Z", id: "c1" };
  const saved: SyncCursor[] = [];

  await assert.rejects(
    processPullEntities(
      ["consultas"],
      2,
      { consultas: previous },
      async () => ({ entity: "consultas", records: [{ id: "c1" }], cursor: previous, hasMore: true }),
      async () => undefined,
      async (cursor) => { saved.push(cursor); },
    ),
    /no avanzó/,
  );
  assert.equal(saved.length, 0);

  await assert.rejects(
    processPullEntities(
      ["consultas"],
      2,
      {},
      async () => ({ entity: "consultas", records: [{ id: "c2" }], cursor: null, hasMore: false }),
      async () => undefined,
      async (cursor) => { saved.push(cursor); },
    ),
    /no devolvió un cursor/,
  );
  assert.deepEqual(saved, []);
});

test("rechaza un cursor sin entidad antes de aplicar la página", async () => {
  let applied = 0;
  await assert.rejects(
    processPullEntities(
      ["consultas"],
      2,
      {},
      async () => ({
        entity: "consultas",
        records: [{ id: "c1" }],
        cursor: { updated: "2026-08-14T12:00:00.000Z", id: "c1" } as SyncCursor,
        hasMore: false,
      }),
      async () => { applied += 1; },
      async () => undefined,
    ),
    /cursor recibido no corresponde/,
  );
  assert.equal(applied, 0);
});

test("compara cursores con updated e id como desempate estable", () => {
  const base: SyncCursor = { entity: "consultas", updated: "2026-08-14T12:00:00.000Z", id: "c1" };
  assert.equal(isCursorAfter({ ...base, id: "c2" }, base), true);
  assert.equal(isCursorAfter({ ...base, updated: "2026-08-15T12:00:00.000Z", id: "a1" }, base), true);
  assert.equal(isCursorAfter(base, base), false);
  assert.equal(isCursorAfter({ ...base, entity: "pacientes" }, base), false);
});

test("completa más de doscientos mil registros mediante tramos reanudables", async () => {
  const totalPages = 1_001;
  const recordsPerPage = 200;
  let pageNumber = 0;
  let durableCursor: SyncCursor | undefined;
  let slices = 0;
  let applied = 0;
  let complete = false;

  while (!complete) {
    const result = await processPullEntities(
      ["consultas"],
      100,
      durableCursor ? { consultas: durableCursor } : {},
      async () => {
        pageNumber += 1;
        const id = String(pageNumber).padStart(6, "0");
        return {
          entity: "consultas",
          records: Array.from({ length: recordsPerPage }, (_, index) => ({ id: `${id}-${index}` })),
          cursor: { entity: "consultas", updated: "2026-08-14T12:00:00.000Z", id },
          hasMore: pageNumber < totalPages,
        };
      },
      async () => { applied += 1; },
      async (cursor) => { durableCursor = cursor; },
    );
    slices += 1;
    complete = result.complete;
  }

  assert.equal(applied, 200_200);
  assert.equal(pageNumber, totalPages);
  assert.equal(slices, 11);
  assert.equal(durableCursor?.id, "001001");
});

function pullPage(entity: SyncEntity, id: string, hasMore: boolean): SyncPullPage {
  return {
    entity,
    records: [{ id }],
    cursor: { entity, updated: "2026-08-14T12:00:00.000Z", id },
    hasMore,
  };
}
