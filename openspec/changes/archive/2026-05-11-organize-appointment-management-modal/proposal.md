## Why

El modal de gestion de turnos acumulo acciones de distinta criticidad: editar datos, reprogramar, cancelar y eliminar. Separarlas reduce errores operativos para secretaria y medico, especialmente cuando la agenda diaria se usa como pantalla principal de trabajo.

## What Changes

- Reorganizar el modal de un turno en secciones claras para datos, reprogramacion y cancelacion.
- Mantener visibles los datos principales del paciente, horario, tipo y estado del turno.
- Dejar las acciones destructivas separadas de la edicion cotidiana.
- No modificar el esquema de PocketBase ni la persistencia existente.

## Capabilities

### New Capabilities

### Modified Capabilities
- `appointment-scheduling`: El modal de turno debera separar la edicion de datos, la reprogramacion y la cancelacion en areas operativas distintas.

## Impact

- Afecta la pantalla `app/turnos/page.tsx`.
- Afecta pruebas Playwright de gestion de turnos cuando abren el modal y ejecutan cancelacion o reprogramacion.
- No requiere migraciones, cambios de colecciones PocketBase ni scripts de importacion.
