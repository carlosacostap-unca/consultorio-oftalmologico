import type { DesktopUpdateChannel } from "./types";
import {
  channelPointerKey,
  manifestArtifactForFile,
  parseDesktopReleaseManifest,
  parseDesktopReleasePointer,
  releaseMetadataKey,
  safeDesktopUpdateFile,
} from "./release-manifest.ts";
import { DesktopUpdateStorageError, type DesktopUpdateObjectStorage } from "./storage-contract.ts";

export async function desktopUpdateFeedResponse(input: {
  channel: DesktopUpdateChannel;
  file: string;
  endpoint: string;
  presignedTtlSeconds: number;
  storage: DesktopUpdateObjectStorage;
}) {
  try {
    const file = safeDesktopUpdateFile(input.file);
    const pointer = parseDesktopReleasePointer(JSON.parse(
      await input.storage.readTextObject(channelPointerKey(input.channel)),
    ));
    if (["latest.yml", "release-manifest.json", "release-manifest.sig"].includes(file)) {
      const body = await input.storage.readTextObject(releaseMetadataKey(pointer.version, file));
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": file.endsWith(".yml") ? "application/yaml; charset=utf-8" : "text/plain; charset=utf-8",
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const rawManifest = await input.storage.readTextObject(
      releaseMetadataKey(pointer.version, "release-manifest.json"),
    );
    const manifest = parseDesktopReleaseManifest(JSON.parse(rawManifest));
    if (manifest.version !== pointer.version) throw new Error("El manifiesto no coincide con el canal");
    const artifact = manifestArtifactForFile(manifest, file);
    if (!artifact) return updateGatewayError(404, "artifact_not_found");

    const url = await input.storage.presignGetObject(artifact.key, input.presignedTtlSeconds);
    assertPresignedStorageUrl(url, input.endpoint);
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "private, no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    if (error instanceof DesktopUpdateStorageError) {
      return updateGatewayError(error.code === "not_found" ? 404 : 502, `storage_${error.code}`);
    }
    return updateGatewayError(400, "invalid_update_request");
  }
}

export function assertPresignedStorageUrl(value: string, endpoint: string) {
  const signed = new URL(value);
  const storage = new URL(endpoint);
  if (signed.protocol !== "https:" && storage.protocol === "https:") throw new Error("Redirección no segura");
  if (signed.origin !== storage.origin) throw new Error("La redirección no pertenece al almacenamiento configurado");
  if (!signed.searchParams.has("X-Amz-Signature")) throw new Error("La URL no está firmada");
}

function updateGatewayError(status: number, code: string) {
  return Response.json(
    { error: "No se pudo entregar el artefacto de actualización", code },
    { status, headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
