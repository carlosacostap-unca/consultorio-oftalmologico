import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BackupError, validBackupKey, type BackupSettings } from "./service";

export async function signBackupDownload(settings: BackupSettings, key: string, credentials: { accessKeyId: string; secretAccessKey: string }) {
  const s3 = settings.s3;
  if (!s3?.enabled || !s3.endpoint || !s3.bucket || !s3.region || !validBackupKey(key)) {
    throw new BackupError(503, "La configuración de descarga de backups está incompleta.");
  }
  const endpoint = new URL(s3.endpoint.includes("://") ? s3.endpoint : `https://${s3.endpoint}`);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash
    || (endpoint.pathname !== "/" && endpoint.pathname !== "")) {
    throw new BackupError(503, "La configuración de descarga de backups no es válida.");
  }
  const client = new S3Client({ endpoint: endpoint.origin, region: s3.region, forcePathStyle: s3.forcePathStyle === true, credentials });
  try {
    return await getSignedUrl(client, new GetObjectCommand({
      Bucket: s3.bucket, Key: key,
      ResponseContentType: "application/zip",
      ResponseContentDisposition: `attachment; filename="${key}"`,
      ResponseCacheControl: "no-store",
    }), { expiresIn: 300 });
  } finally { client.destroy(); }
}
