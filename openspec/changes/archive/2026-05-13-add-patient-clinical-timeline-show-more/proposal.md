## Why

La historia clinica del paciente ya permite leer, filtrar, buscar, accionar y expandir eventos. Cuando hay mas eventos que el resumen inicial, el medico necesita revisar el resto sin abandonar la ficha ni usar el historial tabular.

## What Changes

- Mostrar inicialmente una cantidad acotada de eventos de historia clinica.
- Agregar accion `Mostrar mas` cuando existan eventos ocultos por el limite inicial.
- Agregar accion `Mostrar menos` para volver al resumen inicial.
- Respetar filtros y busqueda actuales al calcular que eventos se muestran.

## Capabilities

### New Capabilities

### Modified Capabilities

- `patient-clinical-timeline`: La linea de tiempo clinica permite expandir o contraer la cantidad de eventos visibles.

## Impact

- `app/pacientes/[id]/page.tsx`: estado local de cantidad expandida y render de controles.
- `tests/playwright/consultorio.spec.ts`: cobertura del comportamiento mostrar mas / mostrar menos.
- Sin cambios de esquema PocketBase, migraciones ni scripts.
