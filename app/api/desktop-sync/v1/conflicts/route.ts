import {
  desktopSyncErrorResponse,
  escapeFilterValue,
  requireDesktopSyncContext,
  touchDevice,
} from "@/lib/desktop-sync/server-auth";
import { pbAdmin } from "@/lib/pocketbase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await requireDesktopSyncContext(request, { requireDevice: true });
    const url = new URL(request.url);
    const status = ["open", "resolved", "discarded"].includes(url.searchParams.get("status") || "")
      ? url.searchParams.get("status")!
      : "open";
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const filter = [`status = "${status}"`];
    if (!context.roles.includes("admin")) {
      filter.push(`device_id = "${escapeFilterValue(context.device!.deviceId)}"`);
    }
    const params = new URLSearchParams({
      page: String(page),
      perPage: "50",
      sort: "-detected_at,-created",
      filter: filter.join(" && "),
    });
    const result = await pbAdmin(`/api/collections/sync_conflicts/records?${params}`);
    await touchDevice(context.device!.id);
    return Response.json(result);
  } catch (error) {
    return desktopSyncErrorResponse(error);
  }
}
