## Why

La secretaria trabaja principalmente sobre el dia operativo: necesita ver rapidamente que medico tiene turnos, que disponibilidad queda libre y desde donde crear nuevos turnos sin saltar entre vistas. Ahora que la agenda ya soporta varios medicos, la vista diaria debe volverse el tablero principal de trabajo para secretaria.

## What Changes

- Convertir la agenda diaria en una vista mas operativa para secretarias.
- Cuando el filtro de medico este en "Todos", agrupar el dia por medico para comparar agendas sin perder contexto.
- Mostrar dentro de cada medico sus turnos otorgados y sus bloques de disponibilidad del dia.
- Permitir crear turnos desde huecos de disponibilidad conservando medico, fecha y horario.
- Mantener acciones rapidas sobre turnos existentes, incluyendo cambio de estado y apertura del detalle.
- Preservar el comportamiento actual de medico: al ingresar como medico solo ve y opera su propia agenda.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `appointment-scheduling`: cambia el comportamiento esperado de la vista diaria para agenda multi-medico y alta rapida desde disponibilidades.

## Impact

- Pantalla `app/turnos/page.tsx`.
- Navegacion hacia `app/turnos/nuevo/page.tsx` con parametros de medico, fecha, hora y disponibilidad.
- Pruebas Playwright existentes de roles y otorgamiento de turnos.
- No requiere migracion ni cambios de colecciones PocketBase.
