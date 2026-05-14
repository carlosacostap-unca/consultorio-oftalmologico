import { pbAdmin } from "./pocketbase-admin";

export type ConsultaEventoTipo = "created" | "updated" | "status_changed";

export interface ConsultaEventoActor {
  id?: string;
  name?: string;
  email?: string;
}

export interface CreateConsultaEventoServerInput {
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

export async function createConsultaEventoServer(input: CreateConsultaEventoServerInput) {
  try {
    const actor = input.actor;
    return await pbAdmin("/api/collections/consulta_eventos/records", {
      method: "POST",
      body: JSON.stringify({
        consulta_id: input.consulta_id,
        paciente_id: input.paciente_id || null,
        actor_id: actor?.id || null,
        actor_nombre: consultaActorLabel(actor),
        tipo: input.tipo,
        titulo: input.titulo,
        detalle: input.detalle || "",
        metadata: input.metadata || {},
      }),
    });
  } catch (error) {
    console.error("Error al registrar evento de consulta:", error);
    return null;
  }
}
