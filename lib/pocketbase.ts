import PocketBase from 'pocketbase';
import { normalizePocketBaseUrl } from './pocketbase-url';
import {
  DESKTOP_SCOPE_MESSAGE,
  desktopCollectionFromRequest,
  isDesktopWritableCollection,
} from './desktop-scope';

// En desarrollo, podemos usar localhost, pero idealmente vendrá de una variable de entorno.
// Si no está definida, usa un valor por defecto o un placeholder.
const desktopPocketBaseUrl =
  typeof window !== 'undefined' ? window.consultorioDesktop?.runtime.pocketBaseUrl : undefined;
const pbUrl = normalizePocketBaseUrl(
  desktopPocketBaseUrl || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090',
);

// Instancia global de PocketBase para evitar múltiples instancias en desarrollo
export const pb = new PocketBase(pbUrl);

pb.beforeSend = (url, options) => {
  const runtime = typeof window !== 'undefined' ? window.consultorioDesktop?.runtime : undefined;
  if (!runtime) return { url, options };

  const method = String(options.method || 'GET').toUpperCase();
  const collection = desktopCollectionFromRequest(url);
  if (collection && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && !isDesktopWritableCollection(collection)) {
    throw new Error(DESKTOP_SCOPE_MESSAGE);
  }

  const headers = new Headers(options.headers);
  headers.set('x-consultorio-device-id', runtime.deviceId);
  if (pb.authStore.record?.id) headers.set('x-consultorio-actor-id', pb.authStore.record.id);
  return { url, options: { ...options, headers } };
};

// Opcional: Desactivar la auto-cancelación de requests si causa problemas en React 18/19
pb.autoCancellation(false);
