import { NextRequest } from "next/server";
import { processAppointmentEmailReminders } from "@/lib/appointment-email-reminders-server";
import { isValidReminderCronSecret } from "@/lib/appointment-reminder-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.APPOINTMENT_REMINDER_CRON_SECRET || "";
  const providedSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

  if (!isValidReminderCronSecret(expectedSecret, providedSecret)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const summary = await processAppointmentEmailReminders();
    return Response.json(summary);
  } catch (error) {
    console.error("Error al procesar recordatorios:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudieron procesar los recordatorios" },
      { status: 500 }
    );
  }
}
