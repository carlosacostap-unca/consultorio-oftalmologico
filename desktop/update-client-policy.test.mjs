import assert from "node:assert/strict";
import test from "node:test";
import {
  publicDesktopUpdateState,
  nextDesktopUpdateReminderAt,
  shouldEnableDesktopUpdater,
  shouldDeferDesktopUpdate,
  shouldInstallMandatoryUpdateOnClose,
  validatedDesktopUpdateFeedUrl,
} from "./update-client-policy.mjs";

test("habilita el updater sólo en Windows x64 empaquetado y fuera de smoke", () => {
  assert.equal(shouldEnableDesktopUpdater({ isPackaged: true, smokeTest: false, platform: "win32", arch: "x64" }), true);
  assert.equal(shouldEnableDesktopUpdater({ isPackaged: false, smokeTest: false, platform: "win32", arch: "x64" }), false);
  assert.equal(shouldEnableDesktopUpdater({ isPackaged: true, smokeTest: true, platform: "win32", arch: "x64" }), false);
  assert.equal(shouldEnableDesktopUpdater({ isPackaged: true, smokeTest: false, platform: "win32", arch: "arm64" }), false);
});

test("pospone sólo una actualización normal durante 24 horas", () => {
  const now = new Date("2026-08-09T12:00:00.000Z");
  const remindAt = nextDesktopUpdateReminderAt(now);
  assert.equal(remindAt, "2026-08-10T12:00:00.000Z");
  assert.equal(shouldDeferDesktopUpdate({ kind: "normal", version: "0.2.0", deferredVersion: "0.2.0", remindAt, now }), true);
  assert.equal(shouldDeferDesktopUpdate({ kind: "mandatory", version: "0.2.0", deferredVersion: "0.2.0", remindAt, now }), false);
  assert.equal(shouldDeferDesktopUpdate({ kind: "normal", version: "0.2.1", deferredVersion: "0.2.0", remindAt, now }), false);
});

test("instala al cerrar sólo una versión obligatoria ya verificada", () => {
  assert.equal(shouldInstallMandatoryUpdateOnClose({ kind: "mandatory", verifiedVersion: "0.2.0", stateVersion: "0.2.0", stateStatus: "ready", shuttingDown: false }), true);
  assert.equal(shouldInstallMandatoryUpdateOnClose({ kind: "normal", verifiedVersion: "0.2.0", stateVersion: "0.2.0", stateStatus: "ready", shuttingDown: false }), false);
  assert.equal(shouldInstallMandatoryUpdateOnClose({ kind: "mandatory", verifiedVersion: null, stateVersion: "0.2.0", stateStatus: "ready", shuttingDown: false }), false);
  assert.equal(shouldInstallMandatoryUpdateOnClose({ kind: "mandatory", verifiedVersion: "0.2.0", stateVersion: "0.2.0", stateStatus: "error", shuttingDown: false }), false);
});

test("acepta únicamente el feed HTTPS central esperado", () => {
  assert.equal(
    validatedDesktopUpdateFeedUrl(
      "https://consultorio.example/api/desktop-updates/v1/feed/",
      "https://consultorio.example",
    ),
    "https://consultorio.example/api/desktop-updates/v1/feed",
  );
  assert.throws(() => validatedDesktopUpdateFeedUrl("https://evil.example/feed", "https://consultorio.example"));
  assert.throws(() => validatedDesktopUpdateFeedUrl("http://consultorio.example/api/desktop-updates/v1/feed", "https://consultorio.example"));
});

test("expone al renderer sólo estados y campos técnicos permitidos", () => {
  assert.deepEqual(publicDesktopUpdateState({
    status: "downloading", version: "0.2.0", kind: "mandatory", percent: 42.7,
    checkedAt: "2026-08-09T12:00:00.000Z", code: "download_ok", secret: "no",
  }), {
    status: "downloading", version: "0.2.0", kind: "mandatory", percent: 43,
    checkedAt: "2026-08-09T12:00:00.000Z", code: "download_ok",
  });
});
