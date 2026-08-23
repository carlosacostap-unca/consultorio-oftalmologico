import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDesktopUpdatePolicyResponse,
  publicDesktopUpdateState,
  nextDesktopUpdateReminderAt,
  resolveDesktopCentralUrl,
  shouldEnableDesktopUpdater,
  shouldDeferDesktopUpdate,
  shouldInstallMandatoryUpdateOnClose,
  validatedDesktopUpdateFeedUrl,
} from "./update-client-policy.mjs";

test("resuelve la URL central desde el entorno con precedencia sobre la activación", () => {
  assert.deepEqual(resolveDesktopCentralUrl({
    configuredUrl: "https://central.example/consultorio/?token=no-debe-quedar#fragmento",
    activationSecret: JSON.stringify({ centralAppUrl: "https://activacion.example" }),
  }), {
    url: "https://central.example/consultorio",
    source: "environment",
  });
});

test("usa la URL HTTPS de la activación cuando Windows no define variables", () => {
  assert.deepEqual(resolveDesktopCentralUrl({
    configuredUrl: "",
    activationSecret: JSON.stringify({ centralAppUrl: "https://consultorio.example/" }),
  }), {
    url: "https://consultorio.example",
    source: "activation",
  });
});

test("trata una activación ausente, corrupta o insegura como configuración faltante", () => {
  assert.equal(resolveDesktopCentralUrl({ configuredUrl: "", activationSecret: "" }), null);
  assert.equal(resolveDesktopCentralUrl({ configuredUrl: "", activationSecret: "{" }), null);
  assert.equal(resolveDesktopCentralUrl({
    configuredUrl: "",
    activationSecret: JSON.stringify({ centralAppUrl: "http://consultorio.example" }),
  }), null);
  assert.throws(() => resolveDesktopCentralUrl({
    configuredUrl: "http://configuracion.example",
    activationSecret: JSON.stringify({ centralAppUrl: "https://consultorio.example" }),
  }), /HTTPS/);
});

test("permite loopback HTTP únicamente durante desarrollo", () => {
  assert.deepEqual(resolveDesktopCentralUrl({
    configuredUrl: "http://127.0.0.1:3000/",
    activationSecret: "",
    allowLocal: true,
  }), {
    url: "http://127.0.0.1:3000",
    source: "environment",
  });
});

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

test("clasifica una sesión vencida sin exponer el token y permite continuar tras reautenticar", () => {
  const expiredToken = "token-central-secreto-de-prueba";
  const expiredState = publicDesktopUpdateState({
    status: "error",
    checkedAt: "2026-08-23T22:00:00.000Z",
    code: classifyDesktopUpdatePolicyResponse(401),
    token: expiredToken,
  });

  assert.equal(expiredState.code, "auth_required");
  assert.equal("token" in expiredState, false);
  assert.equal(JSON.stringify(expiredState).includes(expiredToken), false);
  assert.equal(classifyDesktopUpdatePolicyResponse(403), "auth_required");
  assert.equal(classifyDesktopUpdatePolicyResponse(200), "continue");
  assert.equal(classifyDesktopUpdatePolicyResponse(500), "http_error");
  assert.throws(() => classifyDesktopUpdatePolicyResponse(0), /inválido/);
});
