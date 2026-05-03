import { pbAdmin } from "@/lib/pocketbase-admin";
import {
  CONSULTA_EDIT_LIMIT_DAYS_KEY,
  DEFAULT_CONSULTA_EDIT_LIMIT_DAYS,
  normalizeConsultaEditLimitDays,
} from "@/lib/system-settings";

export async function loadSystemSettings() {
  const setting = await findSetting(CONSULTA_EDIT_LIMIT_DAYS_KEY);

  return {
    consultaEditLimitDays: normalizeConsultaEditLimitDays(
      setting?.value ?? DEFAULT_CONSULTA_EDIT_LIMIT_DAYS
    ),
  };
}

export async function saveConsultaEditLimitDays(value: unknown) {
  const consultaEditLimitDays = normalizeConsultaEditLimitDays(value);
  const existing = await findSetting(CONSULTA_EDIT_LIMIT_DAYS_KEY);

  if (existing) {
    await pbAdmin(`/api/collections/system_settings/records/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value: consultaEditLimitDays }),
    });
  } else {
    await pbAdmin("/api/collections/system_settings/records", {
      method: "POST",
      body: JSON.stringify({ key: CONSULTA_EDIT_LIMIT_DAYS_KEY, value: consultaEditLimitDays }),
    });
  }

  return { consultaEditLimitDays };
}

async function findSetting(key: string) {
  try {
    const result = await pbAdmin(
      `/api/collections/system_settings/records?page=1&perPage=1&filter=${encodeURIComponent(`key = "${key}"`)}`
    );
    return result.items?.[0] || null;
  } catch {
    return null;
  }
}
