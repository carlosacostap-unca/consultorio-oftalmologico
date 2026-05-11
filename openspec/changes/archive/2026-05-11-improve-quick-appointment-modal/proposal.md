## Why

La agenda diaria ya funciona como tablero operativo para secretaria, pero el alta rapida desde un slot todavia debe comunicar mejor el contexto del turno antes de guardar. Mejorar este modal reduce errores al asignar paciente, medico, hora o sobreturno durante la atencion diaria.

## What Changes

- Mostrar en el modal de alta rapida un resumen visible de medico, fecha, hora, tipo, disponibilidad y modo regular/sobreturno.
- Hacer mas clara la busqueda y seleccion de paciente dentro del modal, incluyendo estados sin resultados y paciente seleccionado.
- Mantener integrada la creacion minima de paciente sin abandonar el flujo de alta rapida.
- Mostrar advertencias operativas antes de guardar cuando el paciente ya tenga turno en el dia, turnos cercanos o cuando se este creando un sobreturno sobre un slot ocupado.
- Mostrar confirmacion clara tras guardar y reflejar el turno creado en la agenda diaria sin abandonar `/turnos`.
- No introduce cambios incompatibles ni migraciones de datos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `secretary-appointment-assignment`: mejora los requisitos del alta rapida desde disponibilidad diaria, seleccion de paciente, advertencias y confirmacion.
- `appointment-scheduling`: refuerza el comportamiento de creacion regular y sobreturnos desde slots diarios.

## Impact

- UI principal: `app/turnos/page.tsx`, especialmente el modal de alta rapida y los slots de Agenda Diaria.
- Datos: colecciones existentes `turnos`, `pacientes`, `disponibilidades` y `users`; sin cambio de esquema PocketBase.
- Pruebas: ampliar Playwright para cubrir contexto visible, advertencias, paciente seleccionado y confirmacion de alta rapida.
