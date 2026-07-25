import assert from "node:assert/strict";
import test from "node:test";
import {
  desktopCollectionFromRequest,
  isDesktopSupportedPath,
  isDesktopWritableCollection,
} from "./desktop-scope.ts";

test("limita las escrituras offline a datos clínicos y estado técnico", () => {
  for (const collection of ["pacientes", "consultas", "recetas", "users", "sync_operations"]) {
    assert.equal(isDesktopWritableCollection(collection), true, collection);
  }
  for (const collection of ["turnos", "mutuales", "permissions", "settings"]) {
    assert.equal(isDesktopWritableCollection(collection), false, collection);
  }
});

test("identifica la colección de una escritura PocketBase", () => {
  assert.equal(
    desktopCollectionFromRequest("http://127.0.0.1:8090/api/collections/turnos/records/abc"),
    "turnos",
  );
  assert.equal(desktopCollectionFromRequest("/api/collections/recetas/records"), "recetas");
  assert.equal(desktopCollectionFromRequest("/api/health"), null);
});

test("admite sólo rutas de trabajo incluidas en escritorio", () => {
  for (const pathname of ["/", "/pacientes", "/pacientes/nuevo", "/consultas/abc", "/recetas", "/sincronizacion"]) {
    assert.equal(isDesktopSupportedPath(pathname), true, pathname);
  }
  for (const pathname of ["/turnos", "/mutuales", "/usuarios", "/permisos", "/horarios-medicos"]) {
    assert.equal(isDesktopSupportedPath(pathname), false, pathname);
  }
});
