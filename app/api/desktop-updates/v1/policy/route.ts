import {
  channelPointerKey,
  parseDesktopReleasePointer,
  releaseMetadataKey,
} from "@/lib/desktop-updates/release-manifest";
import { evaluateDesktopUpdatePolicy, parseDesktopUpdateReleasePolicy } from "@/lib/desktop-updates/release-policy";
import { desktopUpdateErrorResponse, requireDesktopUpdateContext } from "@/lib/desktop-updates/server-auth";
import { createDesktopUpdateStorage } from "@/lib/desktop-updates/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await requireDesktopUpdateContext(request);
    const query = new URL(request.url).searchParams;
    const installedVersion = query.get("version") || "";
    const platform = query.get("platform") || "";
    const arch = query.get("arch") || "";
    const osRelease = query.get("osRelease") || "";
    const storage = createDesktopUpdateStorage(context.config);
    const pointer = parseDesktopReleasePointer(JSON.parse(
      await storage.readTextObject(channelPointerKey(context.device.updateChannel)),
    ));
    const rawPolicy = await storage.readTextObject(
      releaseMetadataKey(pointer.version, "release-policy.json"),
    );
    const policy = parseDesktopUpdateReleasePolicy(JSON.parse(rawPolicy));
    if (policy.version !== pointer.version) throw new Error("La política no coincide con el canal");
    const evaluation = evaluateDesktopUpdatePolicy({ installedVersion, platform, arch, osRelease, policy });

    return Response.json({
      channel: context.device.updateChannel,
      feedUrl: context.config.feedUrl,
      policy,
      evaluation,
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return desktopUpdateErrorResponse(error);
  }
}
