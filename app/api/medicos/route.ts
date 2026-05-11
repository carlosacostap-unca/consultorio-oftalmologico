import { NextRequest } from "next/server";
import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";
import { normalizeUserRoles } from "@/lib/permissions";
import type { RoleLikeRecord } from "@/lib/permissions";

interface PocketBaseList<T> {
  items?: T[];
}

interface PocketBaseUserRecord extends RoleLikeRecord {
  id: string;
  email?: string;
  name?: string;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const usersResult = (await pbAdmin(
      "/api/collections/users/records?page=1&perPage=200&sort=name,email"
    )) as PocketBaseList<PocketBaseUserRecord>;

    const medicos = (usersResult.items || [])
      .filter((item) => normalizeUserRoles(item).includes("medico"))
      .map((item) => ({
        id: item.id,
        email: item.email || "",
        name: item.name || item.email || "Medico",
      }));

    return Response.json({ medicos });
  } catch (error) {
    console.error("Error al cargar medicos:", error);
    return Response.json({ error: "No se pudieron cargar los medicos" }, { status: 500 });
  }
}
