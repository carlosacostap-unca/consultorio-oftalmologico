import PocketBase from 'pocketbase';
import { normalizePocketBaseUrl } from './pocketbase-url';
import {
  prepareDesktopPocketBaseRequest,
} from './pocketbase-request';

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
  return prepareDesktopPocketBaseRequest(url, options, {
    deviceId: runtime.deviceId,
    actorId: pb.authStore.record?.id,
  });
};

// Opcional: Desactivar la auto-cancelación de requests si causa problemas en React 18/19
pb.autoCancellation(false);
