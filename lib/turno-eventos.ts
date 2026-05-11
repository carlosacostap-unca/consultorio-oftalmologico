import { pb } from "./pocketbase";

export type TurnoEventoTipo = "created" | "status_changed" | "updated" | "canceled" | "rescheduled";

export interface TurnoEvento {
  id: string;
  turno_id: string;
  actor_id?: string;
  actor_nombre?: string;
  tipo: TurnoEventoTipo;
  titulo: string;
  detalle?: string;
  estado_anterior?: string;
  estado_nuevo?: string;
  fecha_hora_anterior?: string;
  fecha_hora_nueva?: string;
  metadata?: Record<string, unknown>;
  created: string;
}

export interface TurnoEventoActor {
  id?: string;
  name?: string;
  email?: string;
}

export interface CreateTurnoEventoInput {
  turno_id: string;
  tipo: TurnoEventoTipo;
  titulo: string;
  detalle?: string;
  actor?: TurnoEventoActor | null;
  estado_anterior?: string;
  estado_nuevo?: string;
  fecha_hora_anterior?: string | Date;
  fecha_hora_nueva?: string | Date;
  metadata?: Record<string, unknown>;
}

export function actorLabel(actor?: TurnoEventoActor | null) {
  return actor?.name || actor?.email || "Usuario no identificado";
}

export async function createTurnoEvento(input: CreateTurnoEventoInput) {
  try {
    const actor = input.actor;
    return await pb.collection("turno_eventos").create<TurnoEvento>({
      turno_id: input.turno_id,
      actor_id: actor?.id || null,
      actor_nombre: actorLabel(actor),
      tipo: input.tipo,
      titulo: input.titulo,
      detalle: input.detalle || "",
      estado_anterior: input.estado_anterior || "",
      estado_nuevo: input.estado_nuevo || "",
      fecha_hora_anterior: serializeDate(input.fecha_hora_anterior),
      fecha_hora_nueva: serializeDate(input.fecha_hora_nueva),
      metadata: input.metadata || {},
    });
  } catch (error) {
    console.error("Error al registrar evento de turno:", error);
    return null;
  }
}

function serializeDate(value?: string | Date) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}
