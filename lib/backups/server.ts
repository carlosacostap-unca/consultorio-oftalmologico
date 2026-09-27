import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";
import type { BackupDependencies } from "./service";
import { signBackupDownload } from "./storage";

export function backupDependencies(): BackupDependencies {
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY?.trim() || "";
  return {
    isDesktop: process.env.DESKTOP_RUNTIME === "1",
    authorize: requireAdmin,
    settings: async () => (await pbAdmin("/api/settings", { cache: "no-store", signal: AbortSignal.timeout(15000) })).backups,
    list: () => pbAdmin("/api/backups", { cache: "no-store", signal: AbortSignal.timeout(15000) }),
    downloadsEnabled: () => Boolean(accessKeyId && secretAccessKey),
    sign: (settings, key) => signBackupDownload(settings, key, { accessKeyId, secretAccessKey }),
  };
}
