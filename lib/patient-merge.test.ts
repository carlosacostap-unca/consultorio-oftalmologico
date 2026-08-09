import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVE_PATIENT_FILTER,
  DESKTOP_ACTIVE_PATIENT_FILTER,
  appendActivePatientFilter,
  buildActivePatientSearchFilter,
} from "./patient-merge.ts";

test("el filtro web excluye pacientes fusionados sin depender del esquema de escritorio", () => {
  assert.equal(ACTIVE_PATIENT_FILTER, 'estado_registro != "fusionado"');
  assert.doesNotMatch(ACTIVE_PATIENT_FILTER, /sync_deleted/);
});

test("el filtro de escritorio agrega explicitamente la exclusion de bajas logicas", () => {
  assert.equal(
    DESKTOP_ACTIVE_PATIENT_FILTER,
    `${ACTIVE_PATIENT_FILTER} && sync_deleted != true`,
  );
});

test("los filtros web compuestos conservan el contrato compatible", () => {
  const appendedFilter = appendActivePatientFilter('numero_documento = "12345678"');
  const searchFilter = buildActivePatientSearchFilter("Perez");

  assert.match(appendedFilter, /estado_registro != "fusionado"/);
  assert.match(searchFilter, /estado_registro != "fusionado"/);
  assert.doesNotMatch(appendedFilter, /sync_deleted/);
  assert.doesNotMatch(searchFilter, /sync_deleted/);
});
