## Why

La historia clinica unificada ya permite ver consultas y recetas en una misma linea de tiempo. A medida que un paciente acumule eventos, el medico necesitara alternar rapidamente entre todos los eventos, solo consultas o solo recetas.

## What Changes

- Agregar filtros rapidos en la historia clinica del paciente: Todo, Consultas y Recetas.
- Mostrar contadores por filtro para anticipar cuantos eventos se veran.
- Mantener el filtro Todo como seleccion inicial.
- Mostrar estado vacio contextual cuando el filtro seleccionado no tenga eventos.

## Capabilities

### New Capabilities

### Modified Capabilities

- `patient-clinical-timeline`: La linea de tiempo clinica permite filtrar eventos por tipo y muestra contadores.

## Impact

- `app/pacientes/[id]/page.tsx`: estado local de filtro, contadores y render filtrado.
- `tests/playwright/consultorio.spec.ts`: cobertura de cambio de filtros en la historia clinica.
- Sin cambios de esquema PocketBase, migraciones ni scripts.
