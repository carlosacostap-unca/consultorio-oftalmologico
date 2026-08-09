import assert from "node:assert/strict";
import test from "node:test";
import { buildSyncRecordStatusMap, getSyncRecordStatus } from "./desktop-record-status.ts";
import { fichaDisplayLabel, isTemporaryFicha } from "./temporary-ficha.ts";

test("normaliza estados visibles y prioriza conflictos y errores", () => {
  const statuses = buildSyncRecordStatusMap([
    { entity: "pacientes", record_id: "patient-1", status: "sending" },
    { entity: "pacientes", record_id: "patient-1", status: "error" },
    { entity: "consultas", record_id: "visit-1", status: "conflict" },
    { entity: "recetas", record_id: "prescription-1", status: "confirmed" },
  ]);

  assert.equal(getSyncRecordStatus(statuses, "pacientes", "patient-1"), "error");
  assert.equal(getSyncRecordStatus(statuses, "consultas", "visit-1"), "conflict");
  assert.equal(getSyncRecordStatus(statuses, "recetas", "prescription-1"), undefined);
});

test("distingue fichas provisorias sin presentarlas como definitivas", () => {
  assert.equal(isTemporaryFicha("TEMP-PC1-00023"), true);
  assert.equal(fichaDisplayLabel("TEMP-PC1-00023"), "Ficha provisoria TEMP-PC1-00023");
  assert.equal(fichaDisplayLabel("51889"), "Ficha 51889");
});
