## Why

La secretaria necesita preparar y controlar la jornada con un listado imprimible claro por medico y fecha. La impresion actual lista turnos del dia, pero no permite seleccionar medico ni agrupa correctamente cuando se trabaja con mas de una agenda.

## What Changes

- Mejorar el modal de impresion en Gestion de Turnos para seleccionar fecha y medico, con opcion de todos los medicos cuando el rol lo permite.
- Hacer que la pantalla imprimible respete el medico seleccionado o agrupe por medico cuando se imprimen todos.
- Incluir datos operativos esperados: hora, paciente, DNI, telefono, obra social, tipo, motivo, estado y observaciones.
- Mantener formato limpio para papel y una vista previa usable antes de imprimir.
- Agregar prueba Playwright que valide la impresion por medico y agrupada por todos los medicos.

## Capabilities

### New Capabilities

### Modified Capabilities

- `secretary-appointment-assignment`: la secretaria puede generar listados diarios imprimibles por medico o por todas las agendas agrupadas.

## Impact

- UI principal: `app/turnos/page.tsx`.
- Pagina imprimible: `app/turnos/imprimir/page.tsx`.
- Pruebas: `tests/playwright/consultorio.spec.ts`.
- No requiere cambios de esquema PocketBase.
