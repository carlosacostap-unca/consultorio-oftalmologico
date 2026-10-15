import assert from "node:assert/strict";
import test from "node:test";
import {
  canActivateDesktopDevice,
  desktopConflictOwnershipFilters,
  desktopDeviceAccess,
  isDesktopOperationAllowed,
  isDesktopSyncVersionCompatible,
} from "./server-auth-policy.ts";

test("la activación no exige que el equipo ya exista aunque envíe su identidad", () => {
  assert.equal(desktopDeviceAccess(undefined, "device-new"), "skip");
  assert.equal(desktopDeviceAccess(false, "device-new"), "skip");
});

test("las rutas protegidas exigen identidad y consultan el equipo registrado", () => {
  assert.equal(desktopDeviceAccess(true, ""), "missing");
  assert.equal(desktopDeviceAccess(true, "device-active"), "lookup");
});

test("solo un administrador puede registrar un equipo desconocido", () => {
  assert.equal(canActivateDesktopDevice(["admin"], false), true);
  assert.equal(canActivateDesktopDevice(["medico"], false), false);
  assert.equal(canActivateDesktopDevice(["secretaria"], false), false);
  assert.equal(canActivateDesktopDevice(["medico"], true), true);
});

test("la sincronizacion respeta permisos de pacientes por accion", () => {
  const base = {
    roles: ["secretaria"] as const,
    permissions: ["pacientes.view", "pacientes.edit"] as const,
    userId: "secretary-id",
    entity: "pacientes" as const,
    payload: {},
  };

  assert.equal(isDesktopOperationAllowed({ ...base, action: "update" }), true);
  assert.equal(isDesktopOperationAllowed({ ...base, action: "create" }), false);
  assert.equal(isDesktopOperationAllowed({ ...base, action: "delete" }), false);
  assert.equal(isDesktopOperationAllowed({
    ...base,
    permissions: ["pacientes.view", "pacientes.edit", "pacientes.delete"],
    action: "delete",
  }), true);
});

test("un medico no puede mutar registros clinicos de otro medico", () => {
  const consultation = {
    roles: ["medico"] as const,
    permissions: ["consultas.edit", "consultas.delete"] as const,
    userId: "doctor-a",
    entity: "consultas" as const,
    action: "delete" as const,
    payload: { medico_id: "doctor-a" },
  };

  assert.equal(isDesktopOperationAllowed({ ...consultation, centralRecord: { medico_id: "doctor-a" } }), true);
  assert.equal(isDesktopOperationAllowed({ ...consultation, centralRecord: { medico_id: "doctor-b" } }), false);
  assert.equal(isDesktopOperationAllowed({ ...consultation, permissions: ["consultas.edit"] }), false);

  const prescription = {
    ...consultation,
    entity: "recetas" as const,
    permissions: ["recetas.manage"] as const,
  };
  assert.equal(isDesktopOperationAllowed({ ...prescription, centralRecord: { medico_id: "doctor-a" } }), true);
  assert.equal(isDesktopOperationAllowed({ ...prescription, centralRecord: { medico_id: "doctor-b" } }), false);
});

test("una edicion clinica no puede falsificar la autoria del registro central", () => {
  assert.equal(isDesktopOperationAllowed({
    roles: ["medico"],
    permissions: ["consultas.edit"],
    userId: "doctor-a",
    entity: "consultas",
    action: "update",
    payload: { medico_id: "doctor-a" },
    centralRecord: { medico_id: "doctor-b" },
  }), false);
});

test("los conflictos no administrativos quedan limitados por equipo y actor", () => {
  assert.deepEqual(
    desktopConflictOwnershipFilters(["medico"], "device-a", "doctor-a"),
    ['device_id = "device-a"', 'actor_id = "doctor-a"'],
  );
  assert.deepEqual(desktopConflictOwnershipFilters(["admin"], "device-a", "admin-a"), []);
});

test("sincronización exige la versión protegida y rechaza clientes antiguos o sin versión", () => {
  for (const version of [null, "", "0.1.16", "0.1.17-pilot.1", "v0.1.17", "garbage", "0.01.17", "0.1.17, 0.1.16"]) {
    assert.equal(isDesktopSyncVersionCompatible(version), false, String(version));
  }
  for (const version of ["0.1.17", "0.1.17+build.1", "0.1.18", "0.2.0", "1.0.0"]) {
    assert.equal(isDesktopSyncVersionCompatible(version), true, version);
  }
});
