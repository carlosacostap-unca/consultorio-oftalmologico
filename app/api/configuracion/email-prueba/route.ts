import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/pocketbase-admin";
import { sendAppointmentReminderTestEmail } from "@/lib/appointment-email-reminders-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const result = await sendAppointmentReminderTestEmail(body.to);
    return Response.json(result);
  } catch (error) {
    console.error("Error al enviar email de prueba:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar el email de prueba" },
      { status: 500 }
    );
  }
}
