## Why

El piloto de escritorio reveló que el pull incremental puede intentar guardar una receta antes de que exista localmente su consulta relacionada. Además, un error al consultar el estado deja `/sincronizacion` cargando indefinidamente y presenta cualquier falla como falta de conexión, aunque el servidor sea alcanzable.

## What Changes

- Aplicar completamente los cambios centrales en orden de dependencias: pacientes, consultas y finalmente recetas.
- Avanzar cada cursor sólo después de persistir correctamente la página correspondiente.
- Evitar consultas locales que ordenen por campos inexistentes y hacer que la pantalla abandone siempre el estado de carga.
- Clasificar por separado falta de red y errores de datos/sincronización, conservando la copia local y mostrando un mensaje recuperable.
- Agregar pruebas de regresión para dependencias paginadas, errores de carga e indicadores de conectividad.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `offline-data-synchronization`: el pull incremental respetará dependencias entre entidades y el estado visible distinguirá conectividad de errores de sincronización sin bloquear la interfaz.

## Impact

- Cliente de sincronización de escritorio en `lib/desktop-sync/engine.ts` y sus helpers/pruebas.
- Pantalla `app/sincronizacion/page.tsx` e indicador de estado del escritorio.
- No requiere cambios de esquema PocketBase ni modifica datos centrales o clínicos existentes durante el despliegue.
