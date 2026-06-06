export const CONSULTA_EDIT_LIMIT_DAYS_KEY = "consulta_edit_limit_days";
export const DEFAULT_CONSULTA_EDIT_LIMIT_DAYS = 7;
export const APPOINTMENT_REMINDERS_ENABLED_KEY = "appointment_reminders_enabled";
export const APPOINTMENT_REMINDER_HOURS_BEFORE_KEY = "appointment_reminder_hours_before";
export const EMAIL_SMTP_HOST_KEY = "email_smtp_host";
export const EMAIL_SMTP_PORT_KEY = "email_smtp_port";
export const EMAIL_SMTP_SECURE_KEY = "email_smtp_secure";
export const EMAIL_SMTP_USER_KEY = "email_smtp_user";
export const EMAIL_SMTP_FROM_NAME_KEY = "email_smtp_from_name";
export const EMAIL_SMTP_FROM_ADDRESS_KEY = "email_smtp_from_address";
export const EMAIL_SMTP_PASSWORD_ENCRYPTED_KEY = "email_smtp_password_encrypted";
export const APPOINTMENT_REMINDER_EMAIL_SUBJECT_TEMPLATE_KEY = "appointment_reminder_email_subject_template";
export const APPOINTMENT_REMINDER_EMAIL_BODY_TEMPLATE_KEY = "appointment_reminder_email_body_template";

export const DEFAULT_APPOINTMENT_REMINDERS_ENABLED = false;
export const DEFAULT_APPOINTMENT_REMINDER_HOURS_BEFORE = 24;
export const DEFAULT_EMAIL_SMTP_HOST = "smtp.gmail.com";
export const DEFAULT_EMAIL_SMTP_PORT = 465;
export const DEFAULT_EMAIL_SMTP_SECURE = true;
export const DEFAULT_APPOINTMENT_REMINDER_EMAIL_SUBJECT_TEMPLATE = "Recordatorio de turno";
export const DEFAULT_APPOINTMENT_REMINDER_EMAIL_BODY_TEMPLATE = [
  "Hola {{paciente}}.",
  "",
  "Te recordamos tu turno en {{consultorio}}:",
  "Fecha: {{fecha}}",
  "Hora: {{hora}}",
  "Medico: {{medico}}",
  "Tipo: {{tipo}}",
  "Motivo: {{motivo}}",
  "",
  "Si no podes asistir, por favor comunicate con el consultorio.",
].join("\n");

export interface SystemSettings {
  consultaEditLimitDays: number;
  appointmentRemindersEnabled: boolean;
  appointmentReminderHoursBefore: number;
  emailSmtpHost: string;
  emailSmtpPort: number;
  emailSmtpSecure: boolean;
  emailSmtpUser: string;
  emailSmtpFromName: string;
  emailSmtpFromAddress: string;
  emailSmtpPasswordConfigured: boolean;
  appointmentReminderEmailSubjectTemplate: string;
  appointmentReminderEmailBodyTemplate: string;
}

export function normalizeConsultaEditLimitDays(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return DEFAULT_CONSULTA_EDIT_LIMIT_DAYS;
  }

  return Math.floor(numberValue);
}

export function normalizeAppointmentRemindersEnabled(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "si", "sí", "on"].includes(value.trim().toLowerCase());
  return DEFAULT_APPOINTMENT_REMINDERS_ENABLED;
}

export function normalizeAppointmentReminderHoursBefore(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return DEFAULT_APPOINTMENT_REMINDER_HOURS_BEFORE;
  }

  return Math.max(1, Math.floor(numberValue));
}

export function normalizeEmailSmtpHost(value: unknown) {
  const text = String(value || "").trim();
  return text || DEFAULT_EMAIL_SMTP_HOST;
}

export function normalizeEmailSmtpPort(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0 || numberValue > 65535) {
    return DEFAULT_EMAIL_SMTP_PORT;
  }

  return Math.floor(numberValue);
}

export function normalizeEmailSmtpSecure(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "si", "sí", "on"].includes(value.trim().toLowerCase());
  return DEFAULT_EMAIL_SMTP_SECURE;
}

export function normalizeOptionalText(value: unknown) {
  return String(value || "").trim();
}

export function normalizeTemplateText(value: unknown, fallback: string) {
  const text = String(value || "").trim();
  return text || fallback;
}
