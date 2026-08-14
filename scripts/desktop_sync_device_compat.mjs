export function buildDesktopDeviceBackfill(record, { enabledAuthority = "auto" } = {}) {
  const deviceId = text(record.device_id) || text(record.device_key);
  if (!deviceId) throw new Error(`El registro técnico ${text(record.id) || "sin-id"} no tiene identidad de equipo.`);

  const code = text(record.code) || legacyDeviceCodeFromId(deviceId);
  if (!code) throw new Error(`No se pudo derivar el código del equipo ${text(record.id) || deviceId}.`);

  const name = text(record.name) || text(record.nombre) || code;
  const enabled = desktopDeviceEnabled(record, enabledAuthority);
  const activatedBy = text(record.activated_by) || text(record.usuario_id);
  const lastSeenAt = text(record.last_seen_at) || text(record.ultimo_contacto_at);
  const appVersion = text(record.app_version) || metadataText(record.metadata, "appVersion");

  return {
    device_id: deviceId,
    device_key: deviceId,
    code,
    name,
    nombre: name,
    enabled,
    habilitado: enabled,
    modo: text(record.modo) || "desktop",
    activated_by: activatedBy,
    usuario_id: activatedBy,
    activated_at: text(record.activated_at),
    last_seen_at: lastSeenAt,
    ultimo_contacto_at: lastSeenAt,
    last_sync_at: text(record.last_sync_at),
    app_version: appVersion,
    update_channel: record.update_channel === "pilot" ? "pilot" : "stable",
    updates_enabled: record.updates_enabled === true,
    installed_version: text(record.installed_version) || appVersion,
  };
}

export function changedDesktopDeviceFields(record, payload) {
  return Object.keys(payload).filter((key) => normalized(record[key]) !== normalized(payload[key]));
}

export function assertUniqueDesktopDeviceBackfills(items) {
  assertUnique(items, "device_id");
  assertUnique(items, "code");
}

export function legacyDeviceCodeFromId(deviceId) {
  const prefix = String(deviceId || "").replace(/[^a-z0-9]/gi, "").slice(0, 8);
  return prefix ? normalizeDeviceCode(`PC-${prefix}`) : "";
}

export function mergePocketBaseIndexes(existingIndexes, requiredIndexes) {
  const merged = [...existingIndexes];
  const knownNames = new Set(existingIndexes.map(pocketBaseIndexName).filter(Boolean));

  for (const index of requiredIndexes) {
    const name = pocketBaseIndexName(index);
    if (name && knownNames.has(name)) continue;
    if (!name && merged.includes(index)) continue;
    merged.push(index);
    if (name) knownNames.add(name);
  }

  return merged;
}

export function missingPocketBaseIndexes(existingIndexes, requiredIndexes) {
  const knownNames = new Set(existingIndexes.map(pocketBaseIndexName).filter(Boolean));
  return requiredIndexes.filter((index) => {
    const name = pocketBaseIndexName(index);
    return name ? !knownNames.has(name) : !existingIndexes.includes(index);
  });
}

export function desktopDeviceEnabledAuthority(fields) {
  const names = new Set(fields.map((field) => field.name));
  if (names.has("enabled") && !names.has("habilitado")) return "current";
  if (names.has("habilitado") && !names.has("enabled")) return "legacy";
  return names.has("enabled") ? "current" : "legacy";
}

export function transitionalDesktopDeviceFields(fields) {
  const identityFields = new Set(["device_key", "modo", "device_id", "code"]);
  return fields.map((field) => identityFields.has(field.name) ? { ...field, required: false } : field);
}

function pocketBaseIndexName(index) {
  return String(index || "").match(/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+[`"]?([^`"\s]+)[`"]?/i)?.[1] || "";
}

function assertUnique(items, field) {
  const seen = new Map();
  for (const item of items) {
    const value = text(item.payload?.[field]);
    const previous = seen.get(value);
    if (previous) throw new Error(`Los registros técnicos ${previous} y ${item.id} comparten ${field}=${value}.`);
    seen.set(value, item.id);
  }
}

function normalizeDeviceCode(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function metadataText(metadata, key) {
  return metadata && typeof metadata === "object" ? text(metadata[key]) : "";
}

function desktopDeviceEnabled(record, authority) {
  if (authority === "current") return record.enabled === true;
  if (authority === "legacy") return record.habilitado === true;
  return typeof record.habilitado === "boolean" ? record.habilitado : record.enabled === true;
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function normalized(value) {
  return value === undefined || value === null ? "" : value;
}
