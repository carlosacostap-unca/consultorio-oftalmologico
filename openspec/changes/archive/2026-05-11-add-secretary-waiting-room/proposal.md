## Why

Ya mejoramos el otorgamiento de turnos y la agenda diaria, pero secretaria todavia necesita una vista mas enfocada en el seguimiento de pacientes que llegan al consultorio. Una sala de espera operativa permite ver rapidamente quien esta citado, quien llego, quien esta esperando, quien paso a consulta y que acciones corresponden durante el dia.

## What Changes

- Agregar una vista de sala de espera para secretaria dentro de Gestion de Turnos.
- Mostrar turnos del dia agrupados por estado operativo: proximos, en espera, en consulta, atendidos, ausentes y cancelados.
- Mantener filtro por medico y fecha, compatible con la gestion de multiples medicos.
- Destacar proximos pacientes, pacientes esperando y posibles atrasos.
- Ofrecer acciones rapidas desde cada fila/tarjeta: llego, pasar a consulta, atendido, ausente, gestionar turno.
- Mantener la agenda diaria y el alta rapida existentes sin reemplazarlas.
- No introduce migraciones de datos ni cambios de esquema PocketBase.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `secretary-appointment-assignment`: agrega seguimiento de sala de espera y acciones operativas para secretaria.
- `appointment-scheduling`: agrega una vista de turnos del dia orientada a estados de atencion y multiples medicos.

## Impact

- UI principal: `app/turnos/page.tsx`, agregando una nueva vista/pestana operativa.
- Datos: usa la coleccion existente `turnos` con `estado`, `fecha_hora`, `paciente_id` y `medico_id`; sin nuevos campos.
- Pruebas: ampliar Playwright para verificar agrupacion por estado, acciones rapidas y comportamiento multi-medico.
