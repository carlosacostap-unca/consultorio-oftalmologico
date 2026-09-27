import { backupDependencies } from "@/lib/backups/server";
import { listBackupResponse } from "@/lib/backups/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return listBackupResponse(request, backupDependencies());
}
