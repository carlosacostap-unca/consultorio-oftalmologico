import { NextRequest } from "next/server";
import { activeRoleFromRequest, validateDoctorAssignment } from "@/lib/doctor-attribution-server";
import { clinicalDateToStoredDateTime } from "@/lib/clinical-date";
import { normalizeOptionalClinicalZeros } from "@/lib/clinical-empty-values";
import { createConsultaEventoServer } from "@/lib/consulta-eventos-server";
import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";
import { normalizeUserRoles, type UserRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { turno_id: turnoId, ...consultaBody } = body;
    const activeRole = activeRoleFromRequest(request, user) || fallbackActiveRole(user);
    const medicoId = String(consultaBody.medico_id || (activeRole === "medico" ? user.id || "" : ""));

    if (!medicoId) {
      return Response.json({ error: "Selecciona el medico responsable de la consulta." }, { status: 400 });
    }

    if (activeRole !== "medico" || String(user.id || "") !== medicoId) {
      return Response.json(
        { error: "Solo el medico responsable logueado puede crear una consulta." },
        { status: 403 }
      );
    }

    const validation = await validateDoctorAssignment(user, activeRole, medicoId);
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 403 });
    }

    const dataToSave: Record<string, unknown> = {
      ...normalizeConsultaPostBody(normalizeOptionalClinicalZeros(consultaBody)),
      medico_id: medicoId,
    };

    const created = await pbAdmin("/api/collections/consultas/records", {
      method: "POST",
      body: JSON.stringify(dataToSave),
    });

    await createConsultaEventoServer({
      consulta_id: created.id,
      paciente_id: created.paciente_id,
      tipo: "created",
      titulo: "Consulta creada",
      detalle: turnoId ? "Consulta creada desde un turno." : "Consulta creada manualmente.",
      actor: user,
      metadata: {
        turno_id: turnoId || null,
        origen: turnoId ? "turno" : "manual",
        estado: created.estado || dataToSave.estado || null,
        fecha: created.fecha || dataToSave.fecha || null,
        medico_id: created.medico_id || medicoId,
      },
    });

    return Response.json(created);
  } catch (error) {
    console.error("Error al crear consulta:", error);
    return Response.json({ error: consultaCreateErrorMessage(error) }, { status: 500 });
  }
}

function fallbackActiveRole(user: Record<string, unknown>): UserRole | null {
  const roles = normalizeUserRoles(user);
  if (roles.length === 1) return roles[0];
  if (roles.includes("medico")) return "medico";

  return null;
}

function normalizeConsultaPostBody(body: Record<string, unknown>) {
  if (typeof body.fecha !== "string" || !body.fecha) return body;

  return {
    ...body,
    fecha: clinicalDateToStoredDateTime(body.fecha),
  };
}

function consultaCreateErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/PocketBase 400/i.test(message)) {
    if (/add_value|biomicroscopia|unknown field|validation/i.test(message)) {
      return "No se pudo crear la consulta porque el esquema de PocketBase no acepta todos los campos clinicos. Ejecuta la actualizacion de esquema de consultas y vuelve a intentar.";
    }

    return "No se pudo crear la consulta por una validacion de datos. Revisa paciente, fecha y campos clinicos cargados.";
  }

  return "No se pudo crear la consulta";
}
