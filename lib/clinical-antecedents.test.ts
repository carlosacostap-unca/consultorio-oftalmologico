import assert from "node:assert/strict";
import test from "node:test";
import { mergeClinicalAntecedents } from "./clinical-antecedents.ts";

test("mantiene diabetes activa cuando esta registrada en el paciente", () => {
  const antecedentes = mergeClinicalAntecedents(
    { ant_diabetes: false },
    { ant_diabetes: true },
  );

  assert.equal(antecedentes.ant_diabetes, true);
});

test("conserva un antecedente historico aunque ya no figure activo en el paciente", () => {
  const antecedentes = mergeClinicalAntecedents(
    { ant_glaucoma: true },
    { ant_glaucoma: false },
  );

  assert.equal(antecedentes.ant_glaucoma, true);
});

test("combina antecedentes de ambas fuentes y prioriza la observacion de la consulta", () => {
  const antecedentes = mergeClinicalAntecedents(
    { ant_asmatico: true, ant_otra: "Antecedente historico" },
    { ant_diabetes: true, ant_otra: "Antecedente actual" },
  );

  assert.equal(antecedentes.ant_asmatico, true);
  assert.equal(antecedentes.ant_diabetes, true);
  assert.equal(antecedentes.ant_otra, "Antecedente historico");
});
