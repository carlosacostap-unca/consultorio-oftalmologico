import assert from "node:assert/strict";
import test from "node:test";
import { localUserCreationError } from "./client-error.ts";

test("explica de forma segura un rechazo de contraseña local", () => {
  const source = {
    status: 400,
    message: "Something went wrong while processing your request.",
    response: { data: { password: { code: "validation_length_out_of_range" } } },
  };

  const result = localUserCreationError(source);

  assert.match(result.message, /contraseña fue aceptada por staging/i);
  assert.match(result.message, /acceso cifrado/i);
  assert.doesNotMatch(result.message, /validation_length_out_of_range/i);
});

test("identifica campos no sensibles rechazados por PocketBase", () => {
  const result = localUserCreationError({
    status: 400,
    response: { data: { roles: { code: "validation_invalid_value" }, email: { code: "validation_invalid_email" } } },
  });

  assert.equal(result.message, "No se pudo crear el usuario local. Revise: email, roles.");
});

test("conserva errores que no son validaciones de PocketBase", () => {
  const source = new Error("No hay conexión con la base local.");
  assert.equal(localUserCreationError(source), source);
});
