import assert from "node:assert/strict";
import test from "node:test";
import { presentConflict } from "./conflict-presentation.ts";

test("presenta la intención de baja sin informar cero campos diferentes", () => {
  const presentation = presentConflict({
    entity: "pacientes",
    recordId: "patient-record-a",
    operationAction: "delete",
    differingFieldCount: 0,
  });

  assert.equal(presentation.isDelete, true);
  assert.equal(presentation.summary, "Baja pendiente · pacientes · registro patient-record-a");
  assert.equal(presentation.keepCentralLabel, "Cancelar baja y conservar central");
  assert.equal(presentation.applyLocalLabel, "Confirmar baja local");
  assert.equal(presentation.summary.includes("0 campos"), false);
});

test("conserva la presentación comparativa para conflictos de edición", () => {
  const presentation = presentConflict({
    entity: "pacientes",
    recordId: "patient-record-a",
    operationAction: "update",
    differingFieldCount: 2,
  });

  assert.equal(presentation.isDelete, false);
  assert.equal(presentation.summary, "pacientes · registro patient-record-a · 2 campos diferentes");
  assert.equal(presentation.keepCentralLabel, "Conservar central");
  assert.equal(presentation.applyLocalLabel, "Aplicar versión local");
});
