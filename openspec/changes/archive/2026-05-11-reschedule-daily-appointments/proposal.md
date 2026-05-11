## Why

Cuando un paciente no cancela sino que necesita mover su turno, la secretaria debe poder resolverlo desde la misma agenda diaria. Reprogramar el registro existente conserva la trazabilidad sin duplicar turnos.

## What Changes

- Agregar reprogramacion basica desde el modal de gestion de turno.
- Permitir elegir fecha, medico y un slot libre de disponibilidad.
- Actualizar el mismo registro de turno con nuevo medico, fecha/hora, disponibilidad, tipo y duracion.
- Agregar una nota en observaciones con el origen y destino de la reprogramacion.
- Bloquear reprogramacion hacia slots ocupados.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `appointment-scheduling`: agrega reprogramacion de turnos hacia slots libres desde agenda diaria.

## Impact

- Pantalla `app/turnos/page.tsx`.
- Pruebas Playwright de agenda diaria.
- No requiere cambios de schema PocketBase.
