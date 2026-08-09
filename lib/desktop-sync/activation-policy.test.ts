import assert from "node:assert/strict";
import test from "node:test";
import {
  CentralAuthenticationRejectedError,
  completeActivationBootstrap,
  isCentralAuthenticationRejected,
  requireActivatedDesktopLogin,
  requireCentralAuthentication,
  requirePasswordConfigured,
} from "./activation-policy.ts";

test("una activación interrumpida nunca queda marcada como completa y puede reintentarse", async () => {
  const saved: Array<{ bootstrapCompleted: boolean }> = [];
  const initial = { bootstrapCompleted: false };

  await assert.rejects(
    completeActivationBootstrap(
      initial,
      async (state) => { saved.push(state); },
      async () => { throw new Error("conexión interrumpida"); },
    ),
    /conexión interrumpida/,
  );
  assert.deepEqual(saved, [{ bootstrapCompleted: false }]);

  const completed = await completeActivationBootstrap(
    initial,
    async (state) => { saved.push(state); },
    async () => undefined,
  );
  assert.equal(completed.bootstrapCompleted, true);
  assert.deepEqual(saved.slice(-2), [{ bootstrapCompleted: false }, { bootstrapCompleted: true }]);
});

test("un usuario no activado no puede iniciar sesión contra una copia local parcial", () => {
  assert.throws(() => requireActivatedDesktopLogin(null), /no fue activado completamente/);
  assert.throws(() => requireActivatedDesktopLogin({ bootstrapCompleted: false }), /no fue activado completamente/);
  assert.doesNotThrow(() => requireActivatedDesktopLogin({ bootstrapCompleted: true }));
});

test("la activación offline exige una contraseña central configurada", () => {
  assert.throws(() => requirePasswordConfigured({ password_configured: false }), /configurar una contraseña/);
  assert.doesNotThrow(() => requirePasswordConfigured({ password_configured: true }));
});

test("un rechazo central explícito no se degrada a un ingreso offline", () => {
  assert.throws(
    () => requireCentralAuthentication({ ok: false, reason: "rejected" }),
    CentralAuthenticationRejectedError,
  );
  assert.equal(isCentralAuthenticationRejected(new CentralAuthenticationRejectedError()), true);
  assert.equal(isCentralAuthenticationRejected(new Error("servidor no disponible")), false);
});
