import assert from "node:assert/strict";
import test from "node:test";

import { assertTestingPocketBaseUrl } from "../scripts/env_utils.mjs";

const guarded = { requireTest: true };

test("acepta hosts reconocibles de testing y staging", () => {
  for (const url of [
    "https://pocketbase-test.example.com",
    "https://testing.example.com",
    "https://pb-staging.example.com",
    "http://localhost:8090",
    "http://127.0.0.1:8090",
  ]) {
    assert.doesNotThrow(() => assertTestingPocketBaseUrl(url, guarded), url);
  }
});

test("rechaza el host productivo conocido aunque la URL mencione staging", () => {
  assert.throws(
    () => assertTestingPocketBaseUrl(
      "https://pocketbase-consultorio-oftalmologico.acostaparra.com/staging",
      guarded,
    ),
    /invalido/,
  );
});

test("rechaza hosts ambiguos aunque la ruta o query mencionen testing", () => {
  for (const url of [
    "https://datos.example.com/staging",
    "https://datos.example.com?environment=testing",
    "https://datos.example.com",
    "no-es-una-url",
  ]) {
    assert.throws(() => assertTestingPocketBaseUrl(url, guarded), /invalido/, url);
  }
});
