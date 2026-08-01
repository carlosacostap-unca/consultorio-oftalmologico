type PocketBaseValidationError = {
  status?: unknown;
  message?: unknown;
  response?: {
    data?: unknown;
  };
};

const FIELD_LABELS: Record<string, string> = {
  email: "email",
  name: "nombre",
  password: "contraseña",
  passwordConfirm: "confirmación de contraseña",
  role: "rol",
  roles: "roles",
};

export function localUserCreationError(error: unknown): Error {
  if (!isPocketBaseValidationError(error) || error.status !== 400) {
    return error instanceof Error ? error : new Error("No se pudo crear el usuario local.");
  }

  const fields = validationFields(error.response?.data);
  if (fields.includes("password") || fields.includes("passwordConfirm")) {
    return new Error(
      "La contraseña fue aceptada por staging, pero la base local no pudo preparar el acceso cifrado. Vuelva a ingresarla e inténtelo nuevamente.",
      { cause: error },
    );
  }

  if (fields.length > 0) {
    const labels = fields.map((field) => FIELD_LABELS[field] || field).join(", ");
    return new Error(`No se pudo crear el usuario local. Revise: ${labels}.`, { cause: error });
  }

  return new Error("La base local rechazó el usuario descargado. Intente nuevamente o exporte el diagnóstico técnico.", {
    cause: error,
  });
}

function isPocketBaseValidationError(error: unknown): error is PocketBaseValidationError {
  return Boolean(error && typeof error === "object");
}

function validationFields(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  return Object.keys(data).sort();
}
