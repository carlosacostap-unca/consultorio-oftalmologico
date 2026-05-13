## Why

La historia clinica del paciente ya permite buscar, filtrar y accionar sobre eventos. El medico tambien necesita revisar mas contexto clinico sin navegar fuera de la ficha cuando solo quiere confirmar detalles de una consulta o receta.

## What Changes

- Agregar accion para expandir o contraer el detalle de cada evento de historia clinica.
- Mostrar detalle ampliado de consultas con fecha, motivo, diagnostico y tratamiento.
- Mostrar detalle ampliado de recetas con fecha, medicamentos, indicaciones y vinculacion a consulta.
- Mantener acciones actuales de abrir, imprimir y crear receta.

## Capabilities

### New Capabilities

### Modified Capabilities

- `patient-clinical-timeline`: La linea de tiempo clinica permite desplegar detalle contextual de cada evento sin salir de la ficha del paciente.

## Impact

- `app/pacientes/[id]/page.tsx`: estado local de evento expandido y render de detalle.
- `tests/playwright/consultorio.spec.ts`: cobertura del detalle expandible para consulta y receta.
- Sin cambios de esquema PocketBase, migraciones ni scripts.
