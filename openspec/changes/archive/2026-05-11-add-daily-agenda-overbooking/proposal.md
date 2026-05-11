## Why

Cuando un horario esta ocupado, la secretaria igualmente puede necesitar agregar un paciente como sobreturno. Hoy el chip ocupado solo informa el estado, por lo que el flujo queda incompleto: libre permite turno regular, ocupado deberia permitir sobreturno explicito.

## What Changes

- Permitir abrir alta rapida de sobreturno desde un slot ocupado de la agenda diaria.
- Precargar medico, fecha/hora, disponibilidad y tipo desde el slot ocupado.
- Mostrar contexto del turno que ya ocupa el horario.
- Guardar el registro con `es_sobreturno` y `sobreturno_tipo`.
- Representar el sobreturno en la agenda diaria con marca visual.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `appointment-scheduling`: agrega creacion de sobreturnos desde slots ocupados de la agenda diaria.

## Impact

- Pantalla `app/turnos/page.tsx`.
- Pruebas Playwright de agenda diaria.
- No requiere cambios de schema PocketBase.
