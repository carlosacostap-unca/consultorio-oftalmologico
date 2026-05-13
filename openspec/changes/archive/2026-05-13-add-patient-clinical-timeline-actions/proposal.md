## Why

La historia clinica del paciente ya permite leer, filtrar y buscar eventos. Para que el medico trabaje desde el contexto del evento, las consultas de la linea de tiempo necesitan acciones directas para imprimir y emitir una receta vinculada.

## What Changes

- Agregar accion para imprimir consulta en eventos de tipo consulta.
- Agregar accion para crear una nueva receta vinculada desde eventos de tipo consulta.
- Mantener las acciones actuales de receta: ver, imprimir y abrir consulta vinculada cuando exista.
- Cubrir el flujo con Playwright desde la ficha clinica del paciente.

## Capabilities

### New Capabilities

### Modified Capabilities

- `patient-clinical-timeline`: La linea de tiempo clinica permite acciones contextuales segun el tipo de evento.

## Impact

- `app/pacientes/[id]/page.tsx`: nuevas rutas de accion en eventos de consulta y botones contextuales.
- `tests/playwright/consultorio.spec.ts`: cobertura de acciones de consulta desde historia clinica.
- Sin cambios de esquema PocketBase, migraciones ni scripts.
