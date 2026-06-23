## Why

El listado de consultas debe mostrar primero las atenciones clinicas mas recientes para todos los roles. En produccion, dos registros con fecha futura invalida (`9919`) aparecen antes que las consultas reales de 2026 y rompen la lectura cronologica inversa.

## What Changes

- Ordenar el listado principal de consultas por fecha descendente y creacion descendente como desempate.
- Excluir fechas futuras del listado general cuando no hay filtro de fecha explicito.
- Mantener el filtro por fecha seleccionado por el usuario como criterio explicito.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: el listado de consultas debe priorizar atenciones reales recientes en orden cronologico inverso.

## Impact

- `app/consultas/page.tsx`
- Sin cambios de esquema ni datos.
