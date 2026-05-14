import { NextRequest } from "next/server";
import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";
import { loadSystemSettings } from "@/lib/system-settings-server";
import { createConsultaEventoServer } from "@/lib/consulta-eventos-server";
import { consultaEstadoLabel, normalizeConsultaEstado } from "@/lib/consulta-estado";
import { activeRoleFromRequest, validateDoctorAssignment } from "@/lib/doctor-attribution-server";

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
    const body = await request.json();
    const settings = await loadSystemSettings();
    const isOnlyDoctorAttributionChange = onlyDoctorAttributionChanged(body);
    const activeRole = activeRoleFromRequest(request, user);

    if (!isConsultaEditable(current.fecha, settings.consultaEditLimitDays) && !isOnlyDoctorAttributionChange) {
      return Response.json(
        { error: `Solo se pueden editar consultas de los ultimos ${settings.consultaEditLimitDays} dias` },
        { status: 403 }
      );
    }

    if (Object.prototype.hasOwnProperty.call(body, "medico_id")) {
      const validation = await validateDoctorAssignment(user, activeRole, String(body.medico_id || ""));
      if (!validation.ok) {
        return Response.json({ error: validation.error }, { status: 403 });
      }
    }

    const updated = await pbAdmin(`/api/collections/consultas/records/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const changed = changedFields(current, body);
    const estadoChanged =
      Object.prototype.hasOwnProperty.call(body, "estado") &&
      normalizeConsultaEstado(String(current.estado || "")) !== normalizeConsultaEstado(String(updated.estado || ""));

    await createConsultaEventoServer({
      consulta_id: id,
      paciente_id: updated.paciente_id || current.paciente_id,
      tipo: estadoChanged ? "status_changed" : "updated",
      titulo: estadoChanged ? "Estado de consulta actualizado" : "Consulta editada",
      detalle: estadoChanged
        ? `Estado: ${consultaEstadoLabel(String(current.estado || ""))} -> ${consultaEstadoLabel(String(updated.estado || ""))}`
        : "Se actualizaron datos de la consulta.",
      actor: user,
      metadata: {
        changed_fields: changed,
        estado_anterior: estadoChanged ? normalizeConsultaEstado(String(current.estado || "")) : null,
        estado_nuevo: estadoChanged ? normalizeConsultaEstado(String(updated.estado || "")) : null,
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

function onlyDoctorAttributionChanged(body: Record<string, unknown>) {
  const keys = Object.keys(body).filter((key) => !["id", "collectionId", "collectionName", "created", "updated", "expand"].includes(key));
  return keys.length === 1 && keys[0] === "medico_id";
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
