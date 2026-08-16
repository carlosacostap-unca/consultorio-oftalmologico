## Why

La prueba piloto de escritorio 0.1.8 detectó que eliminar un paciente recién sincronizado produce un conflicto técnico con cero campos clínicos diferentes y que resolverlo mediante “Aplicar versión local” restaura el registro en lugar de confirmar su baja. Esto impide limpiar registros con seguridad y bloquea la promoción del canal piloto a estable.

## What Changes

- Conservar en la base local una referencia explícita a la revisión central confirmada, independiente del timestamp generado por PocketBase local.
- Usar esa revisión central como base de altas ya confirmadas, ediciones y bajas posteriores para evitar conflictos técnicos falsos.
- Resolver un conflicto de baja según la intención original de eliminación: conservar central cancela la baja y aplicar local confirma una baja lógica auditable.
- Mostrar los conflictos de baja con una explicación y acciones coherentes, sin presentarlos como “0 campos diferentes”.
- Incorporar pruebas de regresión para crear offline, sincronizar, eliminar y resolver bajas concurrentes.
- No se agregan campos ni migraciones de PocketBase: se reutiliza `sync_base_updated`, ya presente en el esquema de escritorio.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `offline-data-synchronization`: precisa el anclaje de revisión central y la resolución semántica de conflictos de baja.
- `patient-management`: garantiza que una baja de paciente confirmada se mantenga oculta y llegue al servidor sin conflictos técnicos falsos.

## Impact

- Motor cliente de sincronización y captura de operaciones locales bajo `lib/desktop-sync/` y `desktop/pocketbase/pb_hooks/`.
- Endpoint central de resolución de conflictos bajo `app/api/desktop-sync/v1/conflicts/`.
- Pantalla de sincronización de escritorio y presentación de conflictos.
- Pruebas unitarias y de integración del flujo offline; posterior publicación de una nueva versión piloto de escritorio.
- Sin cambios de dependencias, importadores legacy ni esquema de PocketBase.
