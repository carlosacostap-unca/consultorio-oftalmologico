import {
  desktopSyncErrorResponse,
  requireDesktopSyncContext,
  touchDevice,
} from "@/lib/desktop-sync/server-auth";
import { desktopConflictOwnershipFilters } from "@/lib/desktop-sync/server-auth-policy";
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
    const filter = [
      `status = "${status}"`,
      ...desktopConflictOwnershipFilters(context.roles, context.device!.deviceId, context.user.id),
    ];
    const params = new URLSearchParams({
      page: String(page),
      perPage: "50",
      sort: "-detected_at",
      filter: filter.join(" && "),
    });
    const result = await pbAdmin(`/api/collections/sync_conflicts/records?${params}`);
    await touchDevice(context.device!.id);
    return Response.json(result);
  } catch (error) {
    return desktopSyncErrorResponse(error);
  }
}
