import assert from "node:assert/strict";
import test from "node:test";
import {
  initializeDesktopUpdaterWithoutBlocking,
  resolveElectronAutoUpdater,
} from "./update-loader.mjs";

function fakeAutoUpdater() {
  return {
    on() {},
    async checkForUpdates() {},
  };
}

test("resuelve autoUpdater desde exportaciones ESM o CommonJS", () => {
  const named = fakeAutoUpdater();
  const commonJs = fakeAutoUpdater();

  assert.equal(resolveElectronAutoUpdater({ autoUpdater: named }), named);
  assert.equal(resolveElectronAutoUpdater({ default: { autoUpdater: commonJs } }), commonJs);
  assert.throws(
    () => resolveElectronAutoUpdater({ default: {} }),
    /no expuso una instancia compatible/,
  );
});

test("una falla del updater no bloquea el inicio clinico", async () => {
  const expected = new Error("updater no disponible");
  let reported = null;

  const initialized = await initializeDesktopUpdaterWithoutBlocking(
    async () => { throw expected; },
    async (error) => { reported = error; },
  );

  assert.equal(initialized, false);
  assert.equal(reported, expected);
});

test("confirma una inicializacion correcta", async () => {
  let initialized = false;

  const result = await initializeDesktopUpdaterWithoutBlocking(
    async () => { initialized = true; },
    async () => assert.fail("no debe informar una falla"),
  );

  assert.equal(result, true);
  assert.equal(initialized, true);
});
