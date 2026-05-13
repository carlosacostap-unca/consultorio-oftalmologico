## Why

La ficha clinica del paciente ya concentra consultas, recetas e historia, pero al abrirla el medico todavia debe interpretar varias secciones para decidir el siguiente paso. Conviene mostrar una lectura inmediata de continuidad: ultima atencion, ultima indicacion y accion sugerida.

## What Changes

- Agregar un resumen de continuidad actual en la ficha de lectura del paciente.
- Destacar ultima consulta con motivo, diagnostico y tratamiento cuando existan.
- Mostrar ultima receta o indicar que no hay recetas recientes.
- Sugerir una accion principal segun el estado clinico disponible.
- Mantener la historia clinica y las acciones existentes.

## Capabilities

### New Capabilities

### Modified Capabilities
- `patient-clinical-timeline`: La ficha de lectura del paciente debe mostrar un resumen accionable de continuidad clinica.

## Impact

- Afecta `app/pacientes/[id]/page.tsx`.
- Afecta cobertura Playwright en `tests/playwright/consultorio.spec.ts`.
- No requiere cambios de esquema ni migraciones de PocketBase.
