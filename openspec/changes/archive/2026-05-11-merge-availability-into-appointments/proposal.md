## Why

Disponibilidades y turnos forman parte del mismo flujo operativo de agenda. Mantenerlas en pantallas separadas obliga a cambiar de contexto para tareas que se realizan juntas.

## What Changes

- Integrar la gestion de disponibilidades dentro de `/turnos`.
- Agregar una vista/pestana de Disponibilidades en la pantalla de turnos con listado, alta y eliminacion.
- Quitar Disponibilidades como opcion independiente del menu lateral.
- Mantener `/turnos/disponibilidades` como compatibilidad, redirigiendo a `/turnos`.
- Reutilizar la coleccion `disponibilidades` existente sin migraciones.

## Capabilities

### New Capabilities

### Modified Capabilities
- `appointment-scheduling`: mover la administracion de disponibilidades a la pantalla de turnos.
- `access-and-navigation`: quitar Disponibilidades como pantalla separada del menu principal.

## Impact

- Afecta `app/turnos/page.tsx`, `app/turnos/disponibilidades/page.tsx` y `components/Sidebar.tsx`.
- No requiere cambios de esquema de PocketBase.
