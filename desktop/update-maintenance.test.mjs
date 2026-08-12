import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { stopManagedServices, waitWithTimeout } from "./update-maintenance.mjs";

test("detiene Next antes que PocketBase y espera sus salidas", async () => {
  const order = [];
  const services = new Map([
    ["pocketbase", fakeChild("pocketbase", order, true)],
    ["next", fakeChild("next", order, true)],
  ]);
  await stopManagedServices(services, 100);
  assert.deepEqual(order, ["next", "pocketbase"]);
});

test("aborta la preparación si un servicio no cierra", async () => {
  const services = new Map([["next", fakeChild("next", [], false)]]);
  await assert.rejects(stopManagedServices(services, 10), /no cerró dentro del tiempo seguro/);
});

test("limita la espera de una sincronización en curso", async () => {
  await assert.rejects(waitWithTimeout(new Promise(() => undefined), 10, "Sincronización todavía activa"), /todavía activa/);
  assert.equal(await waitWithTimeout(Promise.resolve("ok"), 100, "timeout"), "ok");
});

function fakeChild(name, order, exits) {
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.kill = () => {
    order.push(name);
    if (exits) queueMicrotask(() => child.emit("exit", 0, null));
    return true;
  };
  return child;
}
