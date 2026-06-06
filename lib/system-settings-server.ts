import { pbAdmin } from "@/lib/pocketbase-admin";
import { canEncryptEmailSettings, encryptEmailSecret } from "@/lib/email-settings-secret";
import {
  APPOINTMENT_REMINDER_HOURS_BEFORE_KEY,
  APPOINTMENT_REMINDERS_ENABLED_KEY,
  CONSULTA_EDIT_LIMIT_DAYS_KEY,
  DEFAULT_CONSULTA_EDIT_LIMIT_DAYS,
  EMAIL_SMTP_FROM_ADDRESS_KEY,
  EMAIL_SMTP_FROM_NAME_KEY,
  EMAIL_SMTP_HOST_KEY,
  EMAIL_SMTP_PASSWORD_ENCRYPTED_KEY,
  EMAIL_SMTP_PORT_KEY,
  EMAIL_SMTP_SECURE_KEY,
  EMAIL_SMTP_USER_KEY,
  SystemSettings,
  normalizeAppointmentReminderHoursBefore,
  normalizeAppointmentRemindersEnabled,
  normalizeConsultaEditLimitDays,
  normalizeEmailSmtpHost,
  normalizeEmailSmtpPort,
  normalizeEmailSmtpSecure,
  normalizeOptionalText,
} from "@/lib/system-settings";

export async function loadSystemSettings(): Promise<SystemSettings> {
  const settings = await loadSettingsMap();

  return {
    consultaEditLimitDays: normalizeConsultaEditLimitDays(
      settings.get(CONSULTA_EDIT_LIMIT_DAYS_KEY)?.value ?? DEFAULT_CONSULTA_EDIT_LIMIT_DAYS
    ),
    appointmentRemindersEnabled: normalizeAppointmentRemindersEnabled(
      settings.get(APPOINTMENT_REMINDERS_ENABLED_KEY)?.value
    ),
    appointmentReminderHoursBefore: normalizeAppointmentReminderHoursBefore(
      settings.get(APPOINTMENT_REMINDER_HOURS_BEFORE_KEY)?.value
    ),
    emailSmtpHost: normalizeEmailSmtpHost(settings.get(EMAIL_SMTP_HOST_KEY)?.value),
    emailSmtpPort: normalizeEmailSmtpPort(settings.get(EMAIL_SMTP_PORT_KEY)?.value),
    emailSmtpSecure: normalizeEmailSmtpSecure(settings.get(EMAIL_SMTP_SECURE_KEY)?.value),
    emailSmtpUser: normalizeOptionalText(settings.get(EMAIL_SMTP_USER_KEY)?.value),
    emailSmtpFromName: normalizeOptionalText(settings.get(EMAIL_SMTP_FROM_NAME_KEY)?.value),
    emailSmtpFromAddress: normalizeOptionalText(settings.get(EMAIL_SMTP_FROM_ADDRESS_KEY)?.value),
    emailSmtpPasswordConfigured: Boolean(normalizeOptionalText(settings.get(EMAIL_SMTP_PASSWORD_ENCRYPTED_KEY)?.value)),
  };
}

export async function saveConsultaEditLimitDays(value: unknown) {
  return saveSystemSettings({ consultaEditLimitDays: value });
}

export async function saveSystemSettings(body: Record<string, unknown>) {
  const updates: Array<[string, unknown]> = [];

  if ("consultaEditLimitDays" in body) {
    updates.push([CONSULTA_EDIT_LIMIT_DAYS_KEY, normalizeConsultaEditLimitDays(body.consultaEditLimitDays)]);
  }
  if ("appointmentRemindersEnabled" in body) {
    updates.push([APPOINTMENT_REMINDERS_ENABLED_KEY, normalizeAppointmentRemindersEnabled(body.appointmentRemindersEnabled)]);
  }
  if ("appointmentReminderHoursBefore" in body) {
    updates.push([APPOINTMENT_REMINDER_HOURS_BEFORE_KEY, normalizeAppointmentReminderHoursBefore(body.appointmentReminderHoursBefore)]);
  }
  if ("emailSmtpHost" in body) updates.push([EMAIL_SMTP_HOST_KEY, normalizeEmailSmtpHost(body.emailSmtpHost)]);
  if ("emailSmtpPort" in body) updates.push([EMAIL_SMTP_PORT_KEY, normalizeEmailSmtpPort(body.emailSmtpPort)]);
  if ("emailSmtpSecure" in body) updates.push([EMAIL_SMTP_SECURE_KEY, normalizeEmailSmtpSecure(body.emailSmtpSecure)]);
  if ("emailSmtpUser" in body) updates.push([EMAIL_SMTP_USER_KEY, normalizeOptionalText(body.emailSmtpUser)]);
  if ("emailSmtpFromName" in body) updates.push([EMAIL_SMTP_FROM_NAME_KEY, normalizeOptionalText(body.emailSmtpFromName)]);
  if ("emailSmtpFromAddress" in body) updates.push([EMAIL_SMTP_FROM_ADDRESS_KEY, normalizeOptionalText(body.emailSmtpFromAddress)]);

  const smtpPassword = normalizeOptionalText(body.emailSmtpPassword);
  if (smtpPassword) {
    if (!canEncryptEmailSettings()) {
      throw new Error("Configura EMAIL_SETTINGS_ENCRYPTION_KEY antes de guardar la App Password SMTP");
    }
    updates.push([EMAIL_SMTP_PASSWORD_ENCRYPTED_KEY, encryptEmailSecret(smtpPassword)]);
  }

  for (const [key, value] of updates) {
    await upsertSetting(key, value);
  }

  return loadSystemSettings();
}

export async function loadSettingsMap() {
  const result = await pbAdmin("/api/collections/system_settings/records?page=1&perPage=200");
  const map = new Map<string, { id: string; key: string; value: unknown }>();
  for (const item of result.items || []) {
    if (item?.key) map.set(item.key, item);
  }
  return map;
}

export async function findSetting(key: string) {
  try {
    const result = await pbAdmin(
      `/api/collections/system_settings/records?page=1&perPage=1&filter=${encodeURIComponent(`key = "${key}"`)}`
    );
    return result.items?.[0] || null;
  } catch {
    return null;
  }
}

async function upsertSetting(key: string, value: unknown) {
  const existing = await findSetting(key);

  if (existing) {
    await pbAdmin(`/api/collections/system_settings/records/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
    });
    return;
  }

  await pbAdmin("/api/collections/system_settings/records", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}
