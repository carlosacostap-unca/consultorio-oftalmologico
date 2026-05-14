export type AppointmentType = "Consulta" | "Estudio" | "Cirugia";
export type BlockScope = "general" | "medico";

export interface WeeklyScheduleRule {
  id: string;
  medico_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  tipo: AppointmentType;
  duracion_minutos: number;
  activo?: boolean;
}

export interface ScheduleBlock {
  id: string;
  alcance: BlockScope;
  medico_id?: string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio?: string;
  hora_fin?: string;
  dia_completo?: boolean;
  motivo?: string;
}

export interface AppointmentLike {
  id: string;
  medico_id?: string;
  fecha_hora: string;
  duracion?: number;
  tipo?: string;
}

export interface GeneratedScheduleSlot {
  id: string;
  medico_id: string;
  start: Date;
  end: Date;
  tipo: AppointmentType;
  duracion: number;
  source: "recurrente" | "disponibilidad";
  sourceId: string;
  block?: ScheduleBlock;
  appointment?: AppointmentLike;
}

const MINUTES_IN_DAY = 24 * 60;

export function generateRecurringSlotsForDate(
  date: Date,
  rules: WeeklyScheduleRule[],
  blocks: ScheduleBlock[] = [],
  appointments: AppointmentLike[] = []
) {
  const day = date.getDay();
  const activeRules = rules.filter((rule) => rule.activo !== false && Number(rule.dia_semana) === day);
  const slots: GeneratedScheduleSlot[] = [];

  for (const rule of activeRules) {
    const duration = Math.max(Number(rule.duracion_minutos) || defaultDurationForType(rule.tipo), 1);
    const startMinute = timeToMinutes(rule.hora_inicio);
    const endMinute = timeToMinutes(rule.hora_fin);

    if (startMinute === null || endMinute === null || endMinute <= startMinute) continue;

    for (let minute = startMinute; minute + duration <= endMinute; minute += duration) {
      const start = dateAtMinutes(date, minute);
      const end = dateAtMinutes(date, minute + duration);
      const block = findBlockingBlock({ start, end, medico_id: rule.medico_id, tipo: rule.tipo }, blocks);
      const appointment = findOverlappingAppointment({ start, end, medico_id: rule.medico_id }, appointments);
      slots.push({
        id: `${rule.id}-${dateKey(date)}-${minute}`,
        medico_id: rule.medico_id,
        start,
        end,
        tipo: rule.tipo,
        duracion: duration,
        source: "recurrente",
        sourceId: rule.id,
        block,
        appointment,
      });
    }
  }

  return slots;
}

export function findBlockingBlock(
  slot: { start: Date; end: Date; medico_id?: string; tipo?: string },
  blocks: ScheduleBlock[]
) {
  return blocks.find((block) => blockAppliesToSlot(block, slot));
}

export function blockAppliesToSlot(
  block: ScheduleBlock,
  slot: { start: Date; end: Date; medico_id?: string; tipo?: string }
) {
  if (block.alcance === "medico" && block.medico_id && block.medico_id !== slot.medico_id) {
    return false;
  }

  const blockRange = blockDateRange(block, slot.start);
  if (!blockRange) return false;

  return rangesOverlap(slot.start, slot.end, blockRange.start, blockRange.end);
}

export function findConflictingAppointments(appointments: AppointmentLike[], blocks: ScheduleBlock[]) {
  return appointments
    .map((appointment) => {
      const start = new Date(appointment.fecha_hora);
      if (Number.isNaN(start.getTime())) return null;
      const end = addMinutes(start, Math.max(Number(appointment.duracion) || defaultDurationForType(appointment.tipo), 1));
      const block = findBlockingBlock({ start, end, medico_id: appointment.medico_id, tipo: appointment.tipo }, blocks);

      return block ? { appointment, block, start, end } : null;
    })
    .filter((value): value is { appointment: AppointmentLike; block: ScheduleBlock; start: Date; end: Date } => Boolean(value));
}

export function findOverlappingAppointment(
  slot: { start: Date; end: Date; medico_id?: string },
  appointments: AppointmentLike[]
) {
  return appointments.find((appointment) => {
    if (slot.medico_id && appointment.medico_id !== slot.medico_id) return false;
    const start = new Date(appointment.fecha_hora);
    if (Number.isNaN(start.getTime())) return false;
    const end = addMinutes(start, Math.max(Number(appointment.duracion) || defaultDurationForType(appointment.tipo), 1));
    return rangesOverlap(slot.start, slot.end, start, end);
  });
}

export function defaultDurationForType(type?: string) {
  return type === "Consulta" || !type ? 15 : 30;
}

export function timeToMinutes(value?: string) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function dateAtMinutes(date: Date, minutes: number) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setMinutes(minutes);
  return copy;
}

export function addMinutes(date: Date, minutes: number) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
}

export function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

export function dateKey(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function blockDateRange(block: ScheduleBlock, referenceDate: Date) {
  const startDate = parsePocketBaseDate(block.fecha_inicio);
  const endDate = parsePocketBaseDate(block.fecha_fin);
  if (!startDate || !endDate) return null;

  const refDay = dateKey(referenceDate);
  if (refDay < dateKey(startDate) || refDay > dateKey(endDate)) return null;

  if (block.dia_completo) {
    return {
      start: dateAtMinutes(referenceDate, 0),
      end: dateAtMinutes(referenceDate, MINUTES_IN_DAY),
    };
  }

  const startMinute = timeToMinutes(block.hora_inicio) ?? 0;
  const endMinute = timeToMinutes(block.hora_fin) ?? MINUTES_IN_DAY;
  return {
    start: dateAtMinutes(referenceDate, startMinute),
    end: dateAtMinutes(referenceDate, endMinute),
  };
}

function parsePocketBaseDate(value?: string) {
  if (!value) return null;
  const datePart = value.includes(" ") ? value.split(" ")[0] : value.split("T")[0];
  const date = new Date(`${datePart}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
