import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const role = String(body.role || "") as UserRole;

    if (!email || !ROLE_LABELS[role]) {
      return Response.json({ error: "Completa email y rol" }, { status: 400 });
    }

    const password = `google-${randomUUID()}-${randomUUID()}`;

    const user = await pbAdmin("/api/collections/users/records", {
      method: "POST",
      body: JSON.stringify({
        email,
        name,
        password,
        passwordConfirm: password,
        role,
        verified: true,
        emailVisibility: true,
      }),
    });

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return Response.json({ error: "No se pudo crear el usuario" }, { status: 500 });
  }
}
