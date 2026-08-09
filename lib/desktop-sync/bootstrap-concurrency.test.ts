import assert from "node:assert/strict";
import test from "node:test";
import { forEachWithConcurrency } from "./bootstrap-concurrency.ts";

test("procesa todos los registros sin superar la concurrencia indicada", async () => {
  let active = 0;
  let maximumActive = 0;
  const processed: number[] = [];

  await forEachWithConcurrency(Array.from({ length: 24 }, (_, index) => index), 4, async (item) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    processed.push(item);
    active -= 1;
  });

  assert.equal(maximumActive, 4);
  assert.deepEqual(processed.toSorted((a, b) => a - b), Array.from({ length: 24 }, (_, index) => index));
});

test("deja de tomar nuevos registros cuando una escritura falla", async () => {
  const started: number[] = [];

  await assert.rejects(
    forEachWithConcurrency(Array.from({ length: 50 }, (_, index) => index), 3, async (item) => {
      started.push(item);
      if (item === 4) throw new Error("fallo local");
      await new Promise((resolve) => setTimeout(resolve, 2));
    }),
    /fallo local/,
  );

  assert.ok(started.includes(4));
  assert.ok(started.length < 50);
});

test("rechaza una concurrencia inválida", async () => {
  await assert.rejects(forEachWithConcurrency([], 0, async () => undefined), /entero positivo/);
});
