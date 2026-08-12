import { parseDesktopUpdateReport } from "@/lib/desktop-updates/report-policy";
import {
  desktopUpdateErrorResponse,
  recordDesktopUpdateReport,
  requireDesktopUpdateContext,
} from "@/lib/desktop-updates/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await requireDesktopUpdateContext(request);
    const report = parseDesktopUpdateReport(await request.json());
    await recordDesktopUpdateReport(context.device.id, report);
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return desktopUpdateErrorResponse(error);
  }
}
