import assert from "node:assert/strict";
import test from "node:test";
import type { DesktopUpdateClientState } from "@/lib/desktop-runtime";
import { desktopUpdateSummary } from "./client-presentation.ts";

const baseState: DesktopUpdateClientState = {
  status: "idle",
  version: null,
  kind: null,
  percent: null,
  checkedAt: null,
  code: null,
};

test("explica cuándo falta configurar la conexión central", () => {
  assert.equal(
    desktopUpdateSummary({ ...baseState, status: "error", code: "configuration_required" }),
    "Configurá la conexión central para buscar actualizaciones",
  );
});

test("solicita una nueva sesión cuando la autenticación central no está disponible", () => {
  const summary = desktopUpdateSummary({ ...baseState, status: "error", code: "auth_required" });
  assert.equal(summary, "Volvé a iniciar sesión para buscar actualizaciones");
  assert.doesNotMatch(summary, /sin conexión/i);
});

test("confirma de forma visible que la versión instalada está vigente", () => {
  assert.equal(
    desktopUpdateSummary({ ...baseState, version: "0.1.6", code: "up_to_date" }),
    "La aplicación está actualizada",
  );
});

test("conserva los mensajes de descarga, versión lista y error", () => {
  assert.equal(
    desktopUpdateSummary({ ...baseState, status: "downloading", version: "0.1.6", kind: "normal", percent: 42 }),
    "Descargando 0.1.6: 42%",
  );
  assert.equal(
    desktopUpdateSummary({ ...baseState, status: "ready", version: "0.1.6", kind: "normal" }),
    "Actualización 0.1.6 lista",
  );
  assert.equal(
    desktopUpdateSummary({ ...baseState, status: "error", code: "check_failed" }),
    "No se pudo buscar la actualización",
  );
});
