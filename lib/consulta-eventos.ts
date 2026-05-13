import { pb } from "./pocketbase";

export type ConsultaEventoTipo = "created" | "updated";

export interface ConsultaEvento {
  id: string;
  consulta_id: string;
  paciente_id?: string;
  actor_id?: string;
  actor_nombre?: string;
  tipo: ConsultaEventoTipo;
  titulo: string;
  detalle?: string;
  metadata?: Record<string, unknown>;
  created: string;
}

export interface ConsultaEventoActor {
  id?: string;
  name?: string;
  email?: string;
}

export interface CreateConsultaEventoInput {
  consulta_id: string;
  paciente_id?: string;
  tipo: ConsultaEventoTipo;
  titulo: string;
  detalle?: string;
  actor?: ConsultaEventoActor | null;
  metadata?: Record<string, unknown>;
}

export function consultaActorLabel(actor?: ConsultaEventoActor | null) {
  return actor?.name || actor?.email || "Usuario no identificado";
}

export async function createConsultaEvento(input: CreateConsultaEventoInput) {
  try {
    const actor = input.actor;
    return await pb.collection("consulta_eventos").create<ConsultaEvento>({
      consulta_id: input.consulta_id,
      paciente_id: input.paciente_id || null,
      actor_id: actor?.id || null,
      actor_nombre: consultaActorLabel(actor),
      tipo: input.tipo,
      titulo: input.titulo,
      detalle: input.detalle || "",
      metadata: input.metadata || {},
    });
  } catch (error) {
    console.error("Error al registrar evento de consulta:", error);
    return null;
  }
}
