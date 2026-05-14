import { NextRequest } from "next/server";
import { activeRoleFromRequest, validateDoctorAssignment } from "@/lib/doctor-attribution-server";
import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";

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
    const body = await request.json();

    if (Object.prototype.hasOwnProperty.call(body, "medico_id")) {
      const activeRole = activeRoleFromRequest(request, user);
      const validation = await validateDoctorAssignment(user, activeRole, String(body.medico_id || ""));
      if (!validation.ok) {
        return Response.json({ error: validation.error }, { status: 403 });
      }
    }

    const updated = await pbAdmin(`/api/collections/recetas/records/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    return Response.json(updated);
  } catch (error) {
    console.error("Error al actualizar receta:", error);
    return Response.json({ error: "No se pudo actualizar la receta" }, { status: 500 });
  }
}
