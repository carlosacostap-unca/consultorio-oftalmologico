import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prepareSmokeTestProfile } from "./smoke-profile.mjs";

test("un arranque normal no cambia su perfil ni crea archivos de prueba", () => {
  assert.equal(prepareSmokeTestProfile(["app.exe"], "perfil-normal"), null);
});

test("smoke rechaza perfiles ausentes, relativos, existentes o relacionados sin alterar datos", () => {
  mkdirSync(path.resolve(".tmp"), { recursive: true });
  const root = mkdtempSync(path.resolve(".tmp/smoke-profile-policy-"));
  const normal = path.join(root, "normal");
  mkdirSync(normal);
  const retained = path.join(normal, "data.db");
  writeFileSync(retained, "datos ficticios que deben conservarse");
  for (const args of [[], ["--smoke-test-profile=relativo"], [`--smoke-test-profile=${normal}`],
    [`--smoke-test-profile=${root}`], [`--smoke-test-profile=${path.join(normal, "hijo")}`],
    [`--smoke-test-profile=${path.join(root, "nuevo")}`, `--smoke-test-profile=${path.join(root, "otro")}`]]) {
    assert.throws(() => prepareSmokeTestProfile(["--smoke-test", ...args], normal));
    assert.equal(readFileSync(retained, "utf8"), "datos ficticios que deben conservarse");
    assert.deepEqual(readdirSync(normal), ["data.db"]);
    assert.deepEqual(readdirSync(root), ["normal"]);
  }
});

test("smoke sólo prepara una carpeta nueva y rechaza reutilizarla", () => {
  mkdirSync(path.resolve(".tmp"), { recursive: true });
  const root = mkdtempSync(path.resolve(".tmp/smoke-profile-policy-"));
  const destination = path.join(root, "nuevo");
  const args = ["--smoke-test", `--smoke-test-profile=${destination}`];
  assert.equal(prepareSmokeTestProfile(args, path.join(root, "normal")), destination);
  const marker = readFileSync(path.join(destination, "smoke-test-profile.json"), "utf8");
  assert.equal(JSON.parse(marker).syntheticOnly, true);
  assert.deepEqual(readdirSync(destination), ["smoke-test-profile.json"]);
  assert.throws(() => prepareSmokeTestProfile(args, path.join(root, "normal")));
  assert.equal(readFileSync(path.join(destination, "smoke-test-profile.json"), "utf8"), marker);
});
