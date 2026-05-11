## Why

La lista de disponibilidades necesita mostrar menos acciones directas y permitir revisar cada bloque horario con su contexto completo. Un detalle por disponibilidad facilita ver turnos otorgados y administrar el bloque desde una sola pantalla.

## What Changes

- Eliminar la columna `Acciones` de la tabla de disponibilidades integrada en `/turnos`.
- Hacer que cada fila de disponibilidad navegue a una pantalla de detalle.
- Agregar `/turnos/disponibilidades/[id]` para ver fecha, horario, tipo y turnos otorgados de una disponibilidad.
- Permitir editar fecha, hora inicio, hora fin y tipo desde el detalle.
- Permitir eliminar la disponibilidad desde el detalle.

## Capabilities

### New Capabilities

### Modified Capabilities
- `appointment-scheduling`: agregar detalle editable de disponibilidad y navegacion desde la tabla integrada.

## Impact

- Afecta `app/turnos/page.tsx`.
- Agrega `app/turnos/disponibilidades/[id]/page.tsx`.
- No requiere migraciones de PocketBase.
