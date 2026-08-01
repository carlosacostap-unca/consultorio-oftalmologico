import assert from "node:assert/strict";
import test from "node:test";
import { desktopDeviceAccess } from "./server-auth-policy.ts";

test("la activación no exige que el equipo ya exista aunque envíe su identidad", () => {
  assert.equal(desktopDeviceAccess(undefined, "device-new"), "skip");
  assert.equal(desktopDeviceAccess(false, "device-new"), "skip");
});

test("las rutas protegidas exigen identidad y consultan el equipo registrado", () => {
  assert.equal(desktopDeviceAccess(true, ""), "missing");
  assert.equal(desktopDeviceAccess(true, "device-active"), "lookup");
});
