import { NextRequest } from "next/server";
import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      const input: unknown = await request.json();
      body = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    } catch {
      return Response.json({ error: "Solicitud invalida" }, { status: 400 });
    }

    const userId = String(body.userId || "").trim();
    const password = String(body.password || "");
    const passwordConfirm = String(body.passwordConfirm || "");

    if (!userId) {
      return Response.json({ error: "Selecciona un usuario" }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return Response.json(
        { error: `La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
        { status: 400 }
      );
    }
    if (password !== passwordConfirm) {
      return Response.json({ error: "Las contrasenas no coinciden" }, { status: 400 });
    }

    const user = await pbAdmin(`/api/collections/users/records/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        password,
        passwordConfirm,
        password_configured: true,
      }),
    });

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      password_configured: user.password_configured === true,
    });
  } catch (error) {
    console.error("Error al restablecer contrasena:", error);
    const status = error instanceof Error && error.message.startsWith("PocketBase 404:") ? 404 : 500;
    return Response.json(
      { error: status === 404 ? "Usuario no encontrado" : "No se pudo restablecer la contrasena" },
      { status }
    );
  }
}
