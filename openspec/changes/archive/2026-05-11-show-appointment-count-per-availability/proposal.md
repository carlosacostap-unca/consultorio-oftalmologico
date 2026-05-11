## Why

Al administrar disponibilidades dentro de Turnos, es util ver de un vistazo cuantas citas ya fueron otorgadas en cada bloque horario. Esto ayuda a detectar cupos usados sin abrir otras vistas.

## What Changes

- Agregar una columna `Turnos otorgados` en la tabla integrada de Disponibilidades dentro de `/turnos`.
- Calcular el total usando los turnos cargados cuyo `disponibilidad_id` coincide con cada disponibilidad.
- No cambiar la estructura de datos ni los endpoints.

## Capabilities

### New Capabilities

### Modified Capabilities
- `appointment-scheduling`: mostrar el conteo de turnos otorgados por disponibilidad.

## Impact

- Afecta `app/turnos/page.tsx`.
- No requiere migraciones de PocketBase.
