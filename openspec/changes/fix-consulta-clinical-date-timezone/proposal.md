## Why

Las consultas usan una fecha clinica de dia completo, pero al crear o editar registros se convierten fechas `YYYY-MM-DD` a medianoche UTC. En Argentina esa medianoche se visualiza como el dia anterior en cualquier superficie que interprete la fecha con zona horaria local.

## What Changes

- Normalizar la fecha clinica de consultas para que se conserve el dia elegido por el usuario al guardar, editar, filtrar, validar editabilidad, listar, ver e imprimir.
- Centralizar helpers de fecha clinica para evitar conversiones directas con `new Date("YYYY-MM-DD").toISOString()` en consultas.
- Mantener turnos y disponibilidades fuera del alcance porque representan fecha y hora reales.
- No requiere migracion obligatoria de PocketBase: los registros existentes con medianoche UTC deben mostrarse correctamente por fecha clinica textual, y los nuevos registros se guardaran con una hora estable que no cruce de dia en Argentina.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: las consultas deben tratar `fecha` como fecha clinica estable, sin desplazamiento de dia por zona horaria.

## Impact

- Frontend de nueva consulta, detalle/edicion, listado, historia del paciente e impresiones que muestran o editan fechas de consulta.
- `PATCH /api/consultas/[id]` y reglas compartidas de editabilidad por fecha.
- Helpers compartidos en `lib/`.
- Sin cambios de dependencias ni de esquema PocketBase.
