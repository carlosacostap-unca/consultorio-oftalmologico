import assert from "node:assert/strict";
import test from "node:test";
import { createSyncContinuationScheduler } from "./sync-continuation.ts";

test("deduplica continuaciones y permite que una ejecución programe la siguiente", async () => {
  const callbacks: Array<() => void> = [];
  let executions = 0;
  const scheduler = createSyncContinuationScheduler(
    async () => {
      executions += 1;
      if (executions === 1) scheduler.schedule();
    },
    250,
    fakeTimers(callbacks),
  );

  assert.equal(scheduler.schedule(), true);
  assert.equal(scheduler.schedule(), false);
  assert.equal(callbacks.length, 1);
  callbacks.shift()!();
  await Promise.resolve();
  assert.equal(executions, 1);
  assert.equal(callbacks.length, 1);
  callbacks.shift()!();
  await Promise.resolve();
  assert.equal(executions, 2);
});

test("el mantenimiento cancela la continuación y requiere reanudar antes de programar", () => {
  const callbacks: Array<() => void> = [];
  const scheduler = createSyncContinuationScheduler(async () => undefined, 250, fakeTimers(callbacks));

  scheduler.schedule();
  scheduler.pause();
  assert.equal(scheduler.isScheduled(), false);
  assert.equal(callbacks.length, 0);
  assert.equal(scheduler.schedule(), false);

  scheduler.resume();
  assert.equal(scheduler.schedule(), true);
  assert.equal(callbacks.length, 1);
});

function fakeTimers(callbacks: Array<() => void>) {
  return {
    setTimeout(callback: () => void) {
      callbacks.push(callback);
      return callback as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout(handle: ReturnType<typeof setTimeout>) {
      const index = callbacks.indexOf(handle as unknown as () => void);
      if (index >= 0) callbacks.splice(index, 1);
    },
  };
}
