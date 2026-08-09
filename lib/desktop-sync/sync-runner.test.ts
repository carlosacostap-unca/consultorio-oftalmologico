import assert from "node:assert/strict";
import test from "node:test";
import { createSingleFlightRunner, processInBatches } from "./sync-runner.ts";

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
