import { NextRequest } from "next/server";
import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";
import { legacyRoleForRoles, normalizeRoleInput, normalizeUserRoles } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const userId = String(body.userId || "");
    const roles = normalizeRoleInput(body);

    if (!userId || roles.length === 0) {
      return Response.json({ error: "Datos invalidos" }, { status: 400 });
    }

    if (admin.id === userId && !roles.includes("admin")) {
      return Response.json({ error: "No podes quitarte tu propio rol admin" }, { status: 400 });
    }

    const legacyRole = legacyRoleForRoles(roles);

    const user = await pbAdmin(`/api/collections/users/records/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ role: legacyRole, roles }),
    });
    const normalizedRoles = normalizeUserRoles(user, roles);

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: legacyRoleForRoles(normalizedRoles),
      roles: normalizedRoles,
    });
  } catch (error) {
    console.error("Error al actualizar rol:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el rol" },
      { status: 500 }
    );
  }
}
