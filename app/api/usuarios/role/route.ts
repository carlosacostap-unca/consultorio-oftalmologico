import { NextRequest } from "next/server";
import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const userId = String(body.userId || "");
    const role = String(body.role || "") as UserRole;

    if (!userId || !ROLE_LABELS[role]) {
      return Response.json({ error: "Datos invalidos" }, { status: 400 });
    }

    const user = await pbAdmin(`/api/collections/users/records/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Error al actualizar rol:", error);
    return Response.json({ error: "No se pudo actualizar el rol" }, { status: 500 });
  }
}
