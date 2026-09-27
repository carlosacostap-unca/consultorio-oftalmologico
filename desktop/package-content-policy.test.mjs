import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DesktopPackageContentError,
  findPackageContentViolations,
  findPackagedResourceRoots,
  normalizePackagePath,
  verifyDesktopPackageResources,
} from "./package-content-policy.mjs";

test("acepta la estructura mínima de runtime y recursos PocketBase permitidos", async (t) => {
  const fixture = await createPackageFixture(t);
  const result = await verifyDesktopPackageResources(fixture.resources, {
    asarEntries: () => ["/desktop/main.mjs", "/node_modules/caniuse-lite/data/agents.js"],
  });
  assert.ok(result.inspectedEntries > 0);
});

test("rechaza datos clínicos, pb_data, bases activas y trazas con variantes de ruta", () => {
  const entries = [
    file("APP\\DATA\\paciente.bin"),
    file("app.asar.unpacked/data/otro.bin"),
    file("runtime/Pb_Data/data.db"),
    file("app/archivo.DBF"),
    file("app/local.sqlite-WAL"),
    file("app/pacientes-shm"),
    file("app/.next/server/route.JS.NFT.JSON"),
  ];
  const codes = findPackageContentViolations(entries).map((item) => item.code);
  assert.deepEqual(codes, [
    "clinical_data",
    "pocketbase_runtime_data",
    "active_database",
    "build_trace",
  ]);
  for (const entry of entries) {
    assert.equal(findPackageContentViolations([entry]).length, 1, entry.path);
  }
});

test("rechaza trazas y datos incluidos como entradas lógicas de app.asar", () => {
  const violations = findPackageContentViolations([
    { ...file("/DATA/paciente.bin"), source: "asar" },
    { ...file("/.next/server/route.js.nft.json"), source: "asar" },
  ]);
  assert.deepEqual(violations, [
    { code: "clinical_data", reportedPath: "app.asar (directorio data)" },
    { code: "build_trace", reportedPath: "app.asar" },
  ]);
});

test("rechaza enlaces para que la inspección no pueda escapar de resources", () => {
  assert.deepEqual(findPackageContentViolations([{
    path: "app/.next/node_modules/dependencia",
    kind: "symlink",
    source: "filesystem",
  }]), [{
    code: "symlink",
    reportedPath: "enlace o junction dentro de resources",
  }]);
  assert.deepEqual(findPackageContentViolations([{
    path: "/node_modules/dependencia",
    kind: "symlink",
    source: "asar",
  }]), [{
    code: "symlink",
    reportedPath: "enlace o junction dentro de resources",
  }]);
});

test("permite únicamente el ejecutable, migraciones y hooks bajo resources/pocketbase", () => {
  assert.deepEqual(findPackageContentViolations([
    directory("pocketbase"),
    file("pocketbase/pocketbase.exe"),
    directory("pocketbase/pb_migrations"),
    file("pocketbase/pb_migrations/001.js"),
    directory("pocketbase/pb_hooks"),
    file("pocketbase/pb_hooks/main.pb.js"),
  ]), []);
  assert.deepEqual(findPackageContentViolations([
    file("pocketbase/CHANGELOG.md"),
  ]), [{
    code: "unexpected_pocketbase_resource",
    reportedPath: "pocketbase (contenido fuera de allowlist)",
  }]);
  assert.deepEqual(findPackageContentViolations([{
    path: "/pocketbase/backup.zip",
    kind: "file",
    source: "asar",
  }]), [{
    code: "unexpected_pocketbase_resource",
    reportedPath: "pocketbase (contenido fuera de allowlist)",
  }]);
});

test("normaliza mayúsculas y separadores y rechaza escapes o alias de Windows", () => {
  assert.equal(normalizePackagePath("APP\\DATA. \\archivo.DBF"), "app/data/archivo.dbf");
  assert.throws(() => normalizePackagePath("../data/paciente.db"), DesktopPackageContentError);
  assert.throws(() => normalizePackagePath("C:\\data\\paciente.db"), DesktopPackageContentError);
});

test("falla si no existe una salida unpacked para verificar", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "desktop-package-output-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(
    findPackagedResourceRoots(root),
    (error) => error instanceof DesktopPackageContentError
      && error.code === "package_output_missing",
  );
});

async function createPackageFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "desktop-package-policy-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const resources = path.join(root, "win-unpacked", "resources");
  const directories = [
    "app/.next/server",
    "app/.next/static",
    "app/public",
    "app/node_modules",
    "pocketbase/pb_migrations",
    "pocketbase/pb_hooks",
  ];
  const files = [
    "app.asar",
    "app/server.js",
    "app/.next/BUILD_ID",
    "pocketbase/pocketbase.exe",
  ];
  for (const directory of directories) {
    await mkdir(path.join(resources, directory), { recursive: true });
  }
  for (const target of files) {
    await mkdir(path.dirname(path.join(resources, target)), { recursive: true });
    await writeFile(path.join(resources, target), "fixture");
  }
  return { root, resources };
}

function file(target) {
  return { path: target, kind: "file", source: "filesystem" };
}

function directory(target) {
  return { path: target, kind: "directory", source: "filesystem" };
}
