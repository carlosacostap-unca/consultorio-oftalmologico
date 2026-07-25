## Why

Se detectaron consultas existentes cuya fecha clinica esta guardada a `00:00:00.000Z`; en Argentina ese instante puede visualizarse como el dia anterior si alguna superficie lo interpreta como fecha/hora local. El codigo nuevo ya evita generar mas registros asi, pero los registros historicos afectados deben normalizarse.

## What Changes

- Crear un script administrativo de normalizacion para consultas con `fecha` a medianoche UTC exacta.
- Ejecutar primero en `dry-run`, informando total, ejemplos y destino de cada cambio.
- En modo `--apply`, generar backup JSON antes de actualizar y cambiar solo la hora a `12:00:00.000Z`, manteniendo el mismo dia clinico.
- Escribir reportes de dry-run y resultado en `reports/`.
- No modificar consultas con hora distinta de `00:00:00.000Z`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `data-import-and-migration`: agrega una migracion controlada para normalizar fechas clinicas de consultas guardadas a medianoche UTC.

## Impact

- Nuevo script bajo `scripts/`.
- Reportes en `reports/` y backup bajo `data/backups/`.
- Actualizaciones controladas sobre la coleccion PocketBase `consultas` solo cuando se ejecute con `--apply`.
- Sin cambios de esquema ni dependencias.
