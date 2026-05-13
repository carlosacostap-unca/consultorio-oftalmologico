import { NextRequest } from "next/server";
import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";
import { loadSystemSettings } from "@/lib/system-settings-server";
import { createConsultaEventoServer } from "@/lib/consulta-eventos-server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await context.params;
    const current = await pbAdmin(`/api/collections/consultas/records/${encodeURIComponent(id)}`);
    const settings = await loadSystemSettings();

    if (!isConsultaEditable(current.fecha, settings.consultaEditLimitDays)) {
      return Response.json(
        { error: `Solo se pueden editar consultas de los ultimos ${settings.consultaEditLimitDays} dias` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = await pbAdmin(`/api/collections/consultas/records/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    await createConsultaEventoServer({
      consulta_id: id,
      paciente_id: updated.paciente_id || current.paciente_id,
      tipo: "updated",
      titulo: "Consulta editada",
      detalle: "Se actualizaron datos de la consulta.",
      actor: user,
      metadata: {
        changed_fields: changedFields(current, body),
        fecha_anterior: current.fecha || null,
        fecha_nueva: updated.fecha || null,
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("Error al actualizar consulta:", error);
    return Response.json({ error: "No se pudo actualizar la consulta" }, { status: 500 });
  }
}

function changedFields(current: Record<string, unknown>, next: Record<string, unknown>) {
  return Object.keys(next)
    .filter((key) => !["id", "collectionId", "collectionName", "created", "updated", "expand"].includes(key))
    .filter((key) => normalizeValue(current[key]) !== normalizeValue(next[key]));
}

function normalizeValue(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isConsultaEditable(fecha: string | undefined, limitDays: number) {
  if (!fecha) return true;

  const consultaDate = new Date(fecha);
  if (Number.isNaN(consultaDate.getTime())) return false;

  const today = startOfDay(new Date());
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - limitDays);

  return consultaDate >= minDate;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
