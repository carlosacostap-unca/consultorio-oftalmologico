import assert from "node:assert/strict";
import test from "node:test";
import { doctorLabelFromList } from "./doctor-attribution.ts";

const medicos = [
  { id: "medico-a", name: "Dra. Ana Perez", email: "ana@example.com" },
  { id: "medico-b", name: "Dr. Bruno Diaz", email: "bruno@example.com" },
];

test("resuelve por expansion cuando PocketBase permite verla", () => {
  assert.equal(
    doctorLabelFromList("medico-a", { id: "medico-a", name: "Dra. Ana Expandida" }, medicos),
    "Dra. Ana Expandida",
  );
});

test("resuelve por medico_id cuando otro medico no puede expandir al responsable", () => {
  assert.equal(doctorLabelFromList("medico-b", undefined, medicos), "Dr. Bruno Diaz");
});

test("mantiene un fallback explicito si el medico no puede resolverse", () => {
  assert.equal(doctorLabelFromList("medico-inexistente", undefined, medicos), "Medico no registrado");
  assert.equal(doctorLabelFromList(undefined, undefined, medicos), "Medico no registrado");
});
