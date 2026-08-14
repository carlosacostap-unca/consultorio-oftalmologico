import assert from "node:assert/strict";
import test from "node:test";
import {
  createPullSearchParams,
  normalizePullLimit,
  parsePullCursor,
  requestedPullEntities,
} from "./pull-policy.ts";

test("mantiene límites compatibles con clientes anteriores", () => {
  assert.equal(normalizePullLimit(undefined), 100);
  assert.equal(normalizePullLimit("invalid"), 100);
  assert.equal(normalizePullLimit(0), 1);
  assert.equal(normalizePullLimit(500), 200);
  assert.deepEqual(requestedPullEntities(undefined), ["pacientes", "consultas", "recetas"]);
  assert.deepEqual(requestedPullEntities(["consultas", "unknown"]), ["consultas"]);
});

test("construye una página acotada con orden estable y lookahead", () => {
  const params = createPullSearchParams(200, null, (value) => value);
  assert.equal(params.get("page"), "1");
  assert.equal(params.get("perPage"), "201");
  assert.equal(params.get("sort"), "updated,id");
  assert.equal(params.has("filter"), false);
});

test("reanuda por updated e id y descarta cursores incompletos", () => {
  const cursor = parsePullCursor("consultas", { updated: " 2026-08-14T12:00:00.000Z ", id: " c1 " });
  assert.deepEqual(cursor, { entity: "consultas", updated: "2026-08-14T12:00:00.000Z", id: "c1" });
  const params = createPullSearchParams(100, cursor, (value) => value);
  assert.equal(
    params.get("filter"),
    'updated > "2026-08-14T12:00:00.000Z" || (updated = "2026-08-14T12:00:00.000Z" && id > "c1")',
  );
  assert.equal(parsePullCursor("consultas", { updated: "", id: "c1" }), null);
  assert.equal(parsePullCursor("consultas", null), null);
});
