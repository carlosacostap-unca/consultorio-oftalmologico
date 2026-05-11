## Why

La secretaria necesita identificar al paciente correcto con rapidez al otorgar turnos. La busqueda actual no siempre muestra suficiente contexto y el alta rapida no esta disponible de forma consistente entre el modal rapido de agenda y el formulario completo.

## What Changes

- Ampliar la busqueda de pacientes por apellido, nombre, DNI/numero de documento y telefono.
- Mostrar resultados con documento, telefono y obra social cuando existan.
- Permitir crear un paciente desde el modal rapido de turno sin salir de la agenda.
- Mantener seleccion automatica del paciente creado.
- Advertir si el paciente seleccionado ya tiene turnos el mismo dia.
- No modificar el esquema de PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `appointment-scheduling`: La seleccion de paciente durante el otorgamiento de turnos debera ser mas informativa, permitir alta rapida desde agenda y advertir turnos existentes del paciente en el dia.

## Impact

- Afecta `app/turnos/page.tsx` para el modal rapido desde agenda.
- Afecta `app/turnos/nuevo/page.tsx` para el formulario completo de turno.
- Afecta pruebas Playwright de otorgamiento rapido y formulario completo.
- No requiere migracion ni cambios de colecciones PocketBase.
