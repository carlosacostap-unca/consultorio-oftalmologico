import { backupDependencies } from "@/lib/backups/server";
import { downloadBackupResponse } from "@/lib/backups/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return downloadBackupResponse(request, backupDependencies());
}
