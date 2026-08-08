const POCKETBASE_RECORD_ID_PATTERN = /^[a-z0-9]{15}$/;
const SYSTEM_SETTING_KEY_MAX_LENGTH = 120;
const SYSTEM_SETTING_VALUE_MAX_BYTES = 2_000_000;

export function normalizeLocalUserId(value) {
  const id = String(value ?? "").trim();
  if (!POCKETBASE_RECORD_ID_PATTERN.test(id)) {
    throw new Error("Identificador de usuario local inválido.");
  }
  return id;
}

export function normalizeLocalSystemSetting(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Configuración local inválida.");
  }

  const keys = Object.keys(value);
  if (!keys.every((key) => ["id", "key", "value"].includes(key)) || !Object.hasOwn(value, "value")) {
    throw new Error("Configuración local inválida.");
  }

  const id = String(value.id ?? "").trim();
  const key = typeof value.key === "string" ? value.key.trim() : "";
  if (!POCKETBASE_RECORD_ID_PATTERN.test(id) || key.length < 1 || key.length > SYSTEM_SETTING_KEY_MAX_LENGTH) {
    throw new Error("Configuración local inválida.");
  }

  let serialized;
  try {
    serialized = JSON.stringify(value.value);
  } catch {
    throw new Error("Configuración local inválida.");
  }
  if (serialized === undefined || new TextEncoder().encode(serialized).byteLength > SYSTEM_SETTING_VALUE_MAX_BYTES) {
    throw new Error("Configuración local inválida.");
  }

  return { id, key, value: JSON.parse(serialized) };
}
