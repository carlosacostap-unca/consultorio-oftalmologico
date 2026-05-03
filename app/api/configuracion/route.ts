import { NextRequest } from "next/server";
import { authenticatedUser, requireAdmin } from "@/lib/pocketbase-admin";
import { DEFAULT_CONSULTA_EDIT_LIMIT_DAYS } from "@/lib/system-settings";
import { loadSystemSettings, saveConsultaEditLimitDays } from "@/lib/system-settings-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    return Response.json(await loadSystemSettings());
  } catch (error) {
    console.error("Error al cargar configuracion:", error);
    return Response.json(
      { consultaEditLimitDays: DEFAULT_CONSULTA_EDIT_LIMIT_DAYS },
      { status: 200 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    return Response.json(await saveConsultaEditLimitDays(body.consultaEditLimitDays));
  } catch (error) {
    console.error("Error al guardar configuracion:", error);
    return Response.json({ error: "No se pudo guardar la configuracion" }, { status: 500 });
  }
}
