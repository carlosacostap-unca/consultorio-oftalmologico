import { NextRequest } from "next/server";
import { authenticatedUser, pbAdmin } from "@/lib/pocketbase-admin";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

type PasswordPayload =
  | { ok: true; password: string; passwordConfirm: string }
  | { ok: false; error: string };

function validationError(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

async function passwordPayload(request: NextRequest): Promise<PasswordPayload> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "Solicitud invalida" };
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const password = String(data.password || "");
  const passwordConfirm = String(data.passwordConfirm || "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` };
  }

  if (password !== passwordConfirm) {
    return { ok: false, error: "Las contrasenas no coinciden" };
  }

  return { ok: true, password, passwordConfirm };
}

async function updateOwnPassword(userId: string, password: string, passwordConfirm: string) {
  const updatedUser = await pbAdmin(`/api/collections/users/records/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      password,
      passwordConfirm,
      password_configured: true,
    }),
  });

  return Response.json({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    roles: updatedUser.roles,
    password_configured: updatedUser.password_configured === true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.password_configured === true) {
      return Response.json({ error: "La contrasena ya esta configurada" }, { status: 409 });
    }

    const payload = await passwordPayload(request);
    if (!payload.ok) return validationError(payload.error);

    return updateOwnPassword(user.id, payload.password, payload.passwordConfirm);
  } catch (error) {
    console.error("Error al configurar contrasena:", error);
    return Response.json({ error: "No se pudo configurar la contrasena" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await passwordPayload(request);
    if (!payload.ok) return validationError(payload.error);

    return updateOwnPassword(user.id, payload.password, payload.passwordConfirm);
  } catch (error) {
    console.error("Error al cambiar contrasena:", error);
    return Response.json({ error: "No se pudo cambiar la contrasena" }, { status: 500 });
  }
}
