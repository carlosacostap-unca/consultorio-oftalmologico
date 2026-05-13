## Why

La ficha del paciente ya muestra consultas y recetas, pero el medico necesita reconstruir la evolucion clinica mirando varias secciones separadas. Una linea de tiempo unificada facilita revisar rapidamente que ocurrio, cuando ocurrio y a que registro debe entrar.

## What Changes

- Agregar una seccion de historia clinica en la ficha del paciente con eventos recientes ordenados por fecha descendente.
- Combinar consultas y recetas del paciente en una misma linea de tiempo visual.
- Mostrar para cada evento el tipo, fecha, resumen clinico y acciones para abrir la consulta o receta correspondiente.
- Mantener las secciones existentes de continuidad, historial y recetas, sin cambios de datos ni migraciones.

## Capabilities

### New Capabilities

- `patient-clinical-timeline`: Historia clinica unificada del paciente basada en consultas y recetas recientes.

### Modified Capabilities

- `patient-management`: La ficha de paciente incorpora una vista de historia clinica unificada como parte de la experiencia de lectura clinica.

## Impact

- `app/pacientes/[id]/page.tsx`: nueva seccion visual en modo lectura.
- `lib/types.ts`: posible ampliacion tipada para campos clinicos ya existentes si hace falta.
- `tests/playwright/consultorio.spec.ts`: cobertura de la linea de tiempo con consulta y receta.
- Sin impacto de esquema PocketBase, migraciones o scripts de importacion.
