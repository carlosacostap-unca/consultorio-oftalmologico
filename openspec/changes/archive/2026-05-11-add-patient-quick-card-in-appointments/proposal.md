## Why

La secretaria trabaja sobre turnos, sala de espera y agenda diaria, pero cuando necesita confirmar datos del paciente o revisar antecedentes inmediatos debe salir de Gestion de Turnos. Una ficha rapida dentro de la misma pantalla reduce friccion en recepcion, llamadas y correcciones simples de datos.

## What Changes

- Agregar una ficha rapida de paciente accesible desde los turnos en Gestion de Turnos.
- Mostrar datos de contacto y cobertura: nombre, documento, telefono, email, obra social, afiliado, domicilio y ficha.
- Mostrar ultimos turnos y ultimas consultas del paciente sin abandonar Gestion de Turnos.
- Permitir editar datos minimos administrativos del paciente desde la ficha rapida.
- Mantener enlaces a la ficha completa del paciente y a nueva consulta cuando corresponda.
- Agregar pruebas Playwright para abrir la ficha rapida y guardar una correccion administrativa minima.

## Capabilities

### New Capabilities

### Modified Capabilities

- `secretary-appointment-assignment`: la secretaria puede consultar y corregir datos administrativos del paciente desde Gestion de Turnos.
- `patient-management`: los datos minimos del paciente pueden editarse desde una ficha rapida contextual sin reemplazar la ficha completa.

## Impact

- UI principal: `app/turnos/page.tsx`.
- Datos: colecciones existentes `pacientes`, `turnos` y `consultas`.
- Pruebas: `tests/playwright/consultorio.spec.ts`.
- No requiere cambios de esquema PocketBase.
