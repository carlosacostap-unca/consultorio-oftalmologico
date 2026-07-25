import { decryptEmailSecret } from "@/lib/email-settings-secret";
import {
  EMAIL_SMTP_PASSWORD_ENCRYPTED_KEY,
  SystemSettings,
  normalizeOptionalText,
} from "@/lib/system-settings";
import { findSetting, loadSystemSettings } from "@/lib/system-settings-server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import {
  DEFAULT_REMINDER_LOOKAHEAD_MINUTES,
  normalizeReminderError,
  reminderWindow,
  shouldSendAppointmentReminder,
} from "@/lib/appointment-reminder-core";
import {
  AppointmentReminderTemplateValues,
  renderAppointmentReminderEmail,
} from "@/lib/appointment-reminder-template";
import { sendSmtpMail } from "@/lib/smtp-client";

interface ReminderTurno {
  id: string;
  fecha_hora: string;
  estado?: string;
  tipo?: string;
  motivo?: string;
  recordatorio_email_enviado_at?: string;
  expand?: {
    paciente_id?: {
      nombre?: string;
      apellido?: string;
      email?: string;
    };
    medico_id?: {
      name?: string;
      email?: string;
    };
  };
}

interface ProcessOptions {
  now?: Date;
  lookaheadMinutes?: number;
  sendMail?: typeof sendSmtpMail;
}

export async function processAppointmentEmailReminders(options: ProcessOptions = {}) {
  const settings = await loadSystemSettings();
  const summary = {
    candidates: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    disabled: !settings.appointmentRemindersEnabled,
  };

  if (!settings.appointmentRemindersEnabled) return summary;

  const smtpPassword = await loadSmtpPassword();
  const smtpReady =
    settings.emailSmtpHost &&
    settings.emailSmtpPort &&
    settings.emailSmtpUser &&
    settings.emailSmtpFromAddress &&
    smtpPassword;

  if (!smtpReady) {
    throw new Error("Configuracion SMTP incompleta");
  }

  const now = options.now || new Date();
  const window = reminderWindow({
    now,
    hoursBefore: settings.appointmentReminderHoursBefore,
    lookaheadMinutes: options.lookaheadMinutes ?? DEFAULT_REMINDER_LOOKAHEAD_MINUTES,
  });
  const turnos = await loadCandidateAppointments(window);
  summary.candidates = turnos.length;

  for (const turno of turnos) {
    if (!shouldSendAppointmentReminder(turno, window)) {
      summary.skipped += 1;
      continue;
    }

    try {
      const emailContent = appointmentReminderEmail(turno, settings);
      await (options.sendMail || sendSmtpMail)({
        host: settings.emailSmtpHost,
        port: settings.emailSmtpPort,
        secure: settings.emailSmtpSecure,
        user: settings.emailSmtpUser,
        password: smtpPassword,
        from: settings.emailSmtpFromAddress,
        fromName: settings.emailSmtpFromName,
        to: String(turno.expand?.paciente_id?.email || "").trim(),
        subject: emailContent.subject,
        text: emailContent.text,
      });

      await markAppointmentReminderSent(turno.id);
      summary.sent += 1;
    } catch (error) {
      await markAppointmentReminderError(turno.id, normalizeReminderError(error));
      summary.errors += 1;
    }
  }

  return summary;
}

export async function loadCandidateAppointments(window: { start: Date; end: Date }) {
  const filter = `fecha_hora >= "${window.start.toISOString()}" && fecha_hora <= "${window.end.toISOString()}"`;
  const params = new URLSearchParams({
    page: "1",
    perPage: "200",
    sort: "fecha_hora",
    filter,
    expand: "paciente_id,medico_id",
  });
  const result = await pbAdmin(`/api/collections/turnos/records?${params}`);
  return (result.items || []) as ReminderTurno[];
}

export async function markAppointmentReminderSent(turnoId: string) {
  await pbAdmin(`/api/collections/turnos/records/${encodeURIComponent(turnoId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      recordatorio_email_enviado_at: new Date().toISOString(),
      recordatorio_email_error: "",
    }),
  });
}

export async function markAppointmentReminderError(turnoId: string, error: string) {
  await pbAdmin(`/api/collections/turnos/records/${encodeURIComponent(turnoId)}`, {
    method: "PATCH",
    body: JSON.stringify({ recordatorio_email_error: error }),
  });
}

export async function sendAppointmentReminderTestEmail(to: string, sampleValues?: Partial<AppointmentReminderTemplateValues>) {
  const settings = await loadSystemSettings();
  const recipient = normalizeOptionalText(to).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error("Ingresa un email de prueba valido");
  }

  const smtpPassword = await loadSmtpPassword();
  ensureSmtpReady(settings, smtpPassword);
  const values = {
    paciente: "Paciente Demo",
    fecha: new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
    hora: "09:30",
    medico: "Medico Demo",
    tipo: "Consulta",
    motivo: "Control oftalmologico",
    consultorio: settings.emailSmtpFromName || "Consultorio oftalmologico",
    ...sampleValues,
  };
  const emailContent = renderAppointmentReminderEmail(settings, values);

  await sendSmtpMail({
    host: settings.emailSmtpHost,
    port: settings.emailSmtpPort,
    secure: settings.emailSmtpSecure,
    user: settings.emailSmtpUser,
    password: smtpPassword,
    from: settings.emailSmtpFromAddress,
    fromName: settings.emailSmtpFromName,
    to: recipient,
    subject: emailContent.subject,
    text: emailContent.text,
  });

  return { sent: true, to: recipient };
}

export async function loadSmtpPassword() {
  const setting = await findSetting(EMAIL_SMTP_PASSWORD_ENCRYPTED_KEY);
  const encrypted = normalizeOptionalText(setting?.value);
  return encrypted ? decryptEmailSecret(encrypted) : "";
}

function ensureSmtpReady(settings: SystemSettings, smtpPassword: string) {
  if (
    !settings.emailSmtpHost ||
    !settings.emailSmtpPort ||
    !settings.emailSmtpUser ||
    !settings.emailSmtpFromAddress ||
    !smtpPassword
  ) {
    throw new Error("Configuracion SMTP incompleta");
  }
}

function appointmentReminderEmail(turno: ReminderTurno, settings: SystemSettings) {
  return renderAppointmentReminderEmail(settings, appointmentReminderValues(turno, settings));
}

function appointmentReminderValues(turno: ReminderTurno, settings: SystemSettings): AppointmentReminderTemplateValues {
  const patient = turno.expand?.paciente_id;
  const doctor = turno.expand?.medico_id;
  const patientName = [patient?.apellido, patient?.nombre].filter(Boolean).join(", ") || "paciente";
  const appointmentDate = new Date(turno.fecha_hora);
  const date = appointmentDate.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  const time = appointmentDate.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
  });
  const doctorName = doctor?.name || doctor?.email || "";
  const fromName = settings.emailSmtpFromName || "Consultorio oftalmologico";

  return {
    paciente: patientName,
    fecha: date,
    hora: time,
    medico: doctorName,
    tipo: turno.tipo || "",
    motivo: turno.motivo || "",
    consultorio: fromName,
  };
}
