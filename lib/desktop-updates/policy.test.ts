import assert from "node:assert/strict";
import test from "node:test";
import type { SyncDevice } from "../desktop-sync/types";
import { desktopUpdateAccessDecision } from "./device-policy.ts";
import {
  compareSemVer,
  evaluateDesktopUpdatePolicy,
  isWindows11X64,
  parseDesktopUpdateReleasePolicy,
  parseStrictSemVer,
} from "./release-policy.ts";

const device: SyncDevice = {
  id: "record-a",
  deviceId: "device-a",
  code: "PC-A",
  enabled: true,
  activatedBy: "admin-a",
  activatedAt: "2026-08-09T00:00:00.000Z",
  updateChannel: "pilot",
  updatesEnabled: true,
};

test("autoriza el canal registrado y no un canal elegido por el cliente", () => {
  assert.deepEqual(desktopUpdateAccessDecision({
    sessionValid: true,
    requestedDeviceId: "device-a",
    device,
  }), { allowed: true, channel: "pilot" });
  assert.deepEqual(desktopUpdateAccessDecision({
    sessionValid: true,
    requestedDeviceId: "device-b",
    device,
  }), { allowed: false, status: 403, code: "unknown_device" });
});

test("rechaza token vencido, identidad faltante, equipo revocado y updates deshabilitados", () => {
  assert.deepEqual(desktopUpdateAccessDecision({ sessionValid: false, requestedDeviceId: "device-a", device }), {
    allowed: false, status: 401, code: "invalid_session",
  });
  assert.deepEqual(desktopUpdateAccessDecision({ sessionValid: true, requestedDeviceId: "", device: null }), {
    allowed: false, status: 400, code: "missing_device",
  });
  assert.deepEqual(desktopUpdateAccessDecision({
    sessionValid: true, requestedDeviceId: "device-a", device: { ...device, enabled: false },
  }), { allowed: false, status: 403, code: "disabled_device" });
  assert.deepEqual(desktopUpdateAccessDecision({
    sessionValid: true, requestedDeviceId: "device-a", device: { ...device, updatesEnabled: false },
  }), { allowed: false, status: 403, code: "updates_disabled" });
});

test("acepta SemVer estricto y ordena prereleases según SemVer", () => {
  assert.ok(parseStrictSemVer("1.2.3"));
  assert.ok(parseStrictSemVer("1.2.3-rc.1+build.5"));
  assert.equal(parseStrictSemVer("01.2.3"), null);
  assert.equal(parseStrictSemVer("1.2"), null);
  assert.equal(compareSemVer("1.2.3-rc.1", "1.2.3"), -1);
  assert.equal(compareSemVer("2.0.0", "1.99.99"), 1);
});

test("valida política, mínimo y destino win32-x64", () => {
  const policy = parseDesktopUpdateReleasePolicy({
    version: "0.2.0",
    minimumVersion: "0.1.1",
    kind: "normal",
    platform: "win32",
    arch: "x64",
  });
  assert.equal(policy.version, "0.2.0");
  assert.throws(() => parseDesktopUpdateReleasePolicy({ ...policy, minimumVersion: "0.3.0" }));
  assert.throws(() => parseDesktopUpdateReleasePolicy({ ...policy, arch: "arm64" }));
  assert.equal(isWindows11X64("win32", "x64", "10.0.22631"), true);
  assert.equal(isWindows11X64("win32", "x64", "10.0.19045"), false);
});

test("distingue actualización normal, obligatoria, vigente e incompatible", () => {
  const base = {
    installedVersion: "0.1.1",
    platform: "win32",
    arch: "x64",
    osRelease: "10.0.22631",
    now: new Date("2026-08-09T12:00:00.000Z"),
  };
  const normal = parseDesktopUpdateReleasePolicy({
    version: "0.2.0", minimumVersion: "0.1.0", kind: "normal", platform: "win32", arch: "x64",
  });
  assert.deepEqual(evaluateDesktopUpdatePolicy({ ...base, policy: normal }), {
    status: "available", version: "0.2.0", kind: "normal",
  });
  assert.deepEqual(evaluateDesktopUpdatePolicy({ ...base, policy: { ...normal, minimumVersion: "0.1.2" } }), {
    status: "available", version: "0.2.0", kind: "mandatory",
  });
  assert.deepEqual(evaluateDesktopUpdatePolicy({ ...base, installedVersion: "0.2.0", policy: normal }), {
    status: "up-to-date", version: "0.2.0",
  });
  assert.deepEqual(evaluateDesktopUpdatePolicy({ ...base, osRelease: "10.0.19045", policy: normal }), {
    status: "unsupported-target",
  });
});
