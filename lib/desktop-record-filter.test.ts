import assert from "node:assert/strict";
import test from "node:test";
import { buildActiveRecordFilter, DESKTOP_ACTIVE_RECORD_FILTER } from "./desktop-record-filter.ts";

test("la web no depende del campo opcional sync_deleted", () => {
  assert.equal(buildActiveRecordFilter("fecha <= hoy", false), "fecha <= hoy");
  assert.equal(buildActiveRecordFilter("", false), "");
});

test("el escritorio excluye las bajas lógicas locales", () => {
  assert.equal(
    buildActiveRecordFilter("fecha <= hoy", true),
    `fecha <= hoy && ${DESKTOP_ACTIVE_RECORD_FILTER}`,
  );
  assert.equal(buildActiveRecordFilter("", true), DESKTOP_ACTIVE_RECORD_FILTER);
});
