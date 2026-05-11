import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";
import { legacyRoleForRoles, normalizeRoleInput, normalizeUserRoles } from "@/lib/permissions";
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
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const usersResult = (await pbAdmin(
      "/api/collections/users/records?page=1&perPage=200&sort=email"
    )) as PocketBaseList<PocketBaseUserRecord>;

    return Response.json({
      users: (usersResult.items || []).map((user) => {
        const roles = normalizeUserRoles(user, ["secretaria"]);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: legacyRoleForRoles(roles),
          roles,
        };
      }),
    });
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    return Response.json({ error: "No se pudieron cargar los usuarios" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const roles = normalizeRoleInput(body);

    if (!email || roles.length === 0) {
      return Response.json({ error: "Completa email y al menos un rol" }, { status: 400 });
    }

    const password = `google-${randomUUID()}-${randomUUID()}`;
    const legacyRole = legacyRoleForRoles(roles);

    const user = await pbAdmin("/api/collections/users/records", {
      method: "POST",
      body: JSON.stringify({
        email,
        name,
        password,
        passwordConfirm: password,
        role: legacyRole,
        roles,
        verified: true,
        emailVisibility: true,
      }),
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
    console.error("Error al crear usuario:", error);
    return Response.json({ error: "No se pudo crear el usuario" }, { status: 500 });
  }
}
