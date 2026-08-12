import "server-only";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { DesktopUpdateServerConfig } from "./config-policy";
import { DesktopUpdateStorageError, type DesktopUpdateObjectStorage } from "./storage-contract";

type EnabledConfig = Extract<DesktopUpdateServerConfig, { enabled: true }>;

export function createDesktopUpdateStorage(config: EnabledConfig): DesktopUpdateObjectStorage {
  const client = new S3Client({
    endpoint: config.storage.endpoint,
    region: config.storage.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.storage.accessKeyId,
      secretAccessKey: config.storage.secretAccessKey,
    },
  });

  return {
    async readTextObject(key, maxBytes = 1024 * 1024) {
      try {
        const response = await client.send(new GetObjectCommand({ Bucket: config.storage.bucket, Key: key }));
        if (typeof response.ContentLength === "number" && response.ContentLength > maxBytes) {
          throw new DesktopUpdateStorageError("too_large");
        }
        if (!response.Body) throw new DesktopUpdateStorageError("not_found");
        const text = await response.Body.transformToString("utf-8");
        if (Buffer.byteLength(text, "utf8") > maxBytes) throw new DesktopUpdateStorageError("too_large");
        return text;
      } catch (error) {
        throw normalizeStorageError(error);
      }
    },
    async presignGetObject(key, expiresIn) {
      try {
        return await getSignedUrl(
          client,
          new GetObjectCommand({ Bucket: config.storage.bucket, Key: key }),
          { expiresIn },
        );
      } catch (error) {
        throw normalizeStorageError(error);
      }
    },
  };
}

function normalizeStorageError(error: unknown) {
  if (error instanceof DesktopUpdateStorageError) return error;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  if (candidate?.name === "NoSuchKey" || candidate?.name === "NotFound" || candidate?.$metadata?.httpStatusCode === 404) {
    return new DesktopUpdateStorageError("not_found");
  }
  return new DesktopUpdateStorageError("unavailable");
}
