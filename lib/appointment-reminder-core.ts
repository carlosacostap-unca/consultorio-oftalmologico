export const DEFAULT_REMINDER_LOOKAHEAD_MINUTES = 15;
export const TERMINAL_APPOINTMENT_STATUSES = ["cancelado", "atendido", "ausente"];

export interface ReminderWindowOptions {
  now: Date;
  hoursBefore: number;
  lookaheadMinutes?: number;
}

export interface AppointmentReminderCandidateLike {
  id?: string;
  fecha_hora?: string;
  estado?: string;
  recordatorio_email_enviado_at?: string;
  expand?: {
    paciente_id?: {
      email?: string;
    };
  };
}

export function reminderWindow(options: ReminderWindowOptions) {
  const lookaheadMinutes = options.lookaheadMinutes ?? DEFAULT_REMINDER_LOOKAHEAD_MINUTES;
  const start = new Date(options.now.getTime() + options.hoursBefore * 60 * 60 * 1000);
  const end = new Date(start.getTime() + lookaheadMinutes * 60 * 1000);
  return { start, end };
}

export function isTerminalAppointmentStatus(status: unknown) {
  return TERMINAL_APPOINTMENT_STATUSES.includes(String(status || "").trim().toLowerCase());
}

export function hasPatientEmail(turno: AppointmentReminderCandidateLike) {
  return Boolean(String(turno.expand?.paciente_id?.email || "").trim());
}

export function isAppointmentInReminderWindow(
  turno: AppointmentReminderCandidateLike,
  window: { start: Date; end: Date }
) {
  if (!turno.fecha_hora) return false;
  const date = new Date(turno.fecha_hora);
  if (Number.isNaN(date.getTime())) return false;
  return date >= window.start && date <= window.end;
}

export function shouldSendAppointmentReminder(
  turno: AppointmentReminderCandidateLike,
  window: { start: Date; end: Date }
) {
  return (
    !turno.recordatorio_email_enviado_at &&
    !isTerminalAppointmentStatus(turno.estado) &&
    hasPatientEmail(turno) &&
    isAppointmentInReminderWindow(turno, window)
  );
}

export function normalizeReminderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Error desconocido");
  return message.slice(0, 500);
}
