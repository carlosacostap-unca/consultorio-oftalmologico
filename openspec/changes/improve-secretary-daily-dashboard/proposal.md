## Why

La agenda diaria ya permite operar turnos, sobreturnos y varios medicos, pero todavia exige recorrer demasiada informacion para responder preguntas frecuentes de secretaria como quien espera, que medico esta mas cargado o cual es la proxima accion. Mejorar la vista diaria vuelve mas rapido el trabajo de mostrador sin cambiar el modelo clinico.

## What Changes

- Reorganizar la vista diaria de `/turnos` como tablero operativo para secretaria.
- Destacar resumen por medico, estados del dia y proximo turno relevante.
- Mejorar filtros rapidos por estado y busqueda de paciente dentro del dia.
- Hacer mas visibles las acciones inmediatas sobre turnos del dia.
- Mantener compatibilidad con rol medico, que debe seguir viendo su propia agenda por defecto.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `appointment-scheduling`: mejora la vista diaria para priorizar lectura operativa, filtros y acciones rapidas.
- `secretary-appointment-assignment`: ajusta el flujo de secretaria para que la agenda diaria funcione como tablero de asignacion y seguimiento.

## Impact

- UI principal: `/turnos`, especialmente vista `Agenda Diaria`.
- Pruebas Playwright de agenda diaria y acciones rapidas.
- Sin cambios esperados de esquema PocketBase ni migraciones de datos.
