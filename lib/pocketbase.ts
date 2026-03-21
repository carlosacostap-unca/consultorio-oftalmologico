import PocketBase from 'pocketbase';

// En desarrollo, podemos usar localhost, pero idealmente vendrá de una variable de entorno.
// Si no está definida, usa un valor por defecto o un placeholder.
const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';

// Instancia global de PocketBase para evitar múltiples instancias en desarrollo
export const pb = new PocketBase(pbUrl);

// Opcional: Desactivar la auto-cancelación de requests si causa problemas en React 18/19
pb.autoCancellation(false);
