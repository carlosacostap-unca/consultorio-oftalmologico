import { NextRequest } from "next/server";
import { activeRoleFromRequest, validateDoctorAssignment } from "@/lib/doctor-attribution-server";
import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const activeRole = activeRoleFromRequest(request, user);
    const validation = await validateDoctorAssignment(user, activeRole, String(body.medico_id || ""));
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 403 });
    }

    const created = await pbAdmin("/api/collections/recetas/records", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return Response.json(created);
  } catch (error) {
    console.error("Error al crear receta:", error);
    return Response.json({ error: "No se pudo crear la receta" }, { status: 500 });
  }
}
