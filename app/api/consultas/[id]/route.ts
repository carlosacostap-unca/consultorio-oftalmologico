import { NextRequest } from "next/server";
import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";
import { loadSystemSettings } from "@/lib/system-settings-server";

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

    return Response.json(updated);
  } catch (error) {
    console.error("Error al actualizar consulta:", error);
    return Response.json({ error: "No se pudo actualizar la consulta" }, { status: 500 });
  }
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
