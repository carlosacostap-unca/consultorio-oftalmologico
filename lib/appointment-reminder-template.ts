import {
  DEFAULT_APPOINTMENT_REMINDER_EMAIL_BODY_TEMPLATE,
  DEFAULT_APPOINTMENT_REMINDER_EMAIL_SUBJECT_TEMPLATE,
  SystemSettings,
  normalizeTemplateText,
} from "@/lib/system-settings";

export const APPOINTMENT_REMINDER_TEMPLATE_VARIABLES = [
  "paciente",
  "fecha",
  "hora",
  "medico",
  "tipo",
  "motivo",
  "consultorio",
] as const;

export type AppointmentReminderTemplateVariable = (typeof APPOINTMENT_REMINDER_TEMPLATE_VARIABLES)[number];

export type AppointmentReminderTemplateValues = Record<AppointmentReminderTemplateVariable, string>;

export function renderAppointmentReminderTemplate(template: string, values: Partial<AppointmentReminderTemplateValues>) {
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_match, key: string) => {
    if (!APPOINTMENT_REMINDER_TEMPLATE_VARIABLES.includes(key as AppointmentReminderTemplateVariable)) {
      return "";
    }
    return values[key as AppointmentReminderTemplateVariable] || "";
  });
}

export function renderAppointmentReminderEmail(
  settings: Pick<
    SystemSettings,
    "appointmentReminderEmailSubjectTemplate" | "appointmentReminderEmailBodyTemplate"
  >,
  values: Partial<AppointmentReminderTemplateValues>
) {
  const subjectTemplate = normalizeTemplateText(
    settings.appointmentReminderEmailSubjectTemplate,
    DEFAULT_APPOINTMENT_REMINDER_EMAIL_SUBJECT_TEMPLATE
  );
  const bodyTemplate = normalizeTemplateText(
    settings.appointmentReminderEmailBodyTemplate,
    DEFAULT_APPOINTMENT_REMINDER_EMAIL_BODY_TEMPLATE
  );
  const subject =
    renderAppointmentReminderTemplate(subjectTemplate, values).trim() ||
    DEFAULT_APPOINTMENT_REMINDER_EMAIL_SUBJECT_TEMPLATE;
  const text =
    renderAppointmentReminderTemplate(bodyTemplate, values).trim() ||
    renderAppointmentReminderTemplate(DEFAULT_APPOINTMENT_REMINDER_EMAIL_BODY_TEMPLATE, values).trim();

  return { subject, text };
}
