import { desktopUpdateFeedResponse } from "@/lib/desktop-updates/gateway";
import { requireDesktopUpdateContext, desktopUpdateErrorResponse } from "@/lib/desktop-updates/server-auth";
import { createDesktopUpdateStorage } from "@/lib/desktop-updates/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  try {
    const updateContext = await requireDesktopUpdateContext(_request);
    const { file } = await context.params;
    return desktopUpdateFeedResponse({
      channel: updateContext.device.updateChannel,
      file,
      endpoint: updateContext.config.storage.endpoint,
      presignedTtlSeconds: updateContext.config.presignedTtlSeconds,
      storage: createDesktopUpdateStorage(updateContext.config),
    });
  } catch (error) {
    return desktopUpdateErrorResponse(error);
  }
}
