## Why

La secretaria necesita identificar el proximo horario libre sin interpretar manualmente el rango completo de una disponibilidad. Mostrar slots libres y ocupados dentro de cada bloque reduce errores y acelera el alta diaria de turnos.

## What Changes

- Mostrar chips de horarios dentro de cada disponibilidad en la agenda diaria.
- Marcar cada horario como libre u ocupado segun los turnos del medico.
- Abrir el modal de alta rapida desde un horario libre exacto.
- Mantener visibles los horarios ocupados con datos basicos del turno.
- No crear todavia sobreturnos desde horarios ocupados; quedara para un paso posterior.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `appointment-scheduling`: agrega visualizacion de slots libres/ocupados en disponibilidades diarias.

## Impact

- Pantalla `app/turnos/page.tsx`.
- Pruebas Playwright de agenda diaria y alta rapida.
- No requiere cambios de schema PocketBase.
