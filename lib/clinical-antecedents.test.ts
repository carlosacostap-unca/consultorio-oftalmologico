import assert from "node:assert/strict";
import test from "node:test";
import {
  hasClinicalAntecedents,
  mergeClinicalAntecedents,
  normalizeClinicalAntecedents,
} from "./clinical-antecedents.ts";

test("normaliza antecedentes fijos y la observacion libre del paciente", () => {
  const antecedentes = normalizeClinicalAntecedents({
    ant_diabetes: true,
    ant_maculopatia: true,
    ant_otra: "Uveitis",
  });

  assert.equal(antecedentes.ant_diabetes, true);
  assert.equal(antecedentes.ant_maculopatia, true);
  assert.equal(antecedentes.ant_glaucoma, false);
  assert.equal(antecedentes.ant_otra, "Uveitis");
});

test("detecta antecedentes cuando solo existe la observacion libre", () => {
  assert.equal(hasClinicalAntecedents({ ant_otra: "  Uveitis  " }), true);
});

test("habilita el respaldo historico cuando la ficha no tiene antecedentes", () => {
  assert.equal(hasClinicalAntecedents({ ant_otra: "   " }), false);
  assert.equal(hasClinicalAntecedents(null), false);
});

test("recupera diabetes del paciente cuando la consulta legacy no la registra", () => {
  const antecedentes = mergeClinicalAntecedents(
    {},
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

test("combina diabetes de la ficha con maculopatia y uveitis de la consulta anterior", () => {
  const antecedentes = mergeClinicalAntecedents(
    { ant_maculopatia: true, ant_otra: "UVEITIS" },
    { ant_diabetes: true },
  );

  assert.equal(antecedentes.ant_diabetes, true);
  assert.equal(antecedentes.ant_maculopatia, true);
  assert.equal(antecedentes.ant_otra, "UVEITIS");
});
