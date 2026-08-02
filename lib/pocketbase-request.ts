import type { BeforeSendResult, SendOptions } from "pocketbase";
import {
  DESKTOP_CENTRAL_SYNC_ORIGIN,
  DESKTOP_SCOPE_MESSAGE,
  DESKTOP_SYNC_ORIGIN_HEADER,
  desktopCollectionFromRequest,
  isDesktopBootstrapWritableCollection,
  isDesktopWritableCollection,
} from "./desktop-scope.ts";

export type DesktopPocketBaseRequestContext = {
  deviceId: string;
  actorId?: string | null;
};

export function prepareDesktopPocketBaseRequest(
  url: string,
  options: SendOptions,
  context: DesktopPocketBaseRequestContext,
): BeforeSendResult {
  const method = String(options.method || "GET").toUpperCase();
  const collection = desktopCollectionFromRequest(url);
  const normalizedHeaders = new Headers(options.headers);
  const isCentralBootstrapWrite = Boolean(
    collection
    && ["POST", "PATCH", "PUT"].includes(method)
    && isDesktopBootstrapWritableCollection(collection)
    && normalizedHeaders.get(DESKTOP_SYNC_ORIGIN_HEADER) === DESKTOP_CENTRAL_SYNC_ORIGIN,
  );
  if (
    collection
    && ["POST", "PATCH", "PUT", "DELETE"].includes(method)
    && !isDesktopWritableCollection(collection)
    && !isCentralBootstrapWrite
  ) {
    throw new Error(DESKTOP_SCOPE_MESSAGE);
  }

  normalizedHeaders.set("x-consultorio-device-id", context.deviceId);
  if (context.actorId) normalizedHeaders.set("x-consultorio-actor-id", context.actorId);

  const headers: Record<string, string> = {};
  normalizedHeaders.forEach((value, name) => {
    headers[name] = value;
  });

  return { url, options: { ...options, headers } };
}
