## Why

La historia clinica del paciente ya combina consultas y recetas con filtros por tipo. Cuando el paciente acumula muchos eventos, el medico necesita encontrar rapidamente menciones a diagnosticos, motivos, medicamentos o indicaciones sin recorrer toda la linea de tiempo.

## What Changes

- Agregar un campo de busqueda dentro de la historia clinica del paciente.
- Filtrar localmente los eventos por texto coincidente en tipo, fecha, motivo, diagnostico, tratamiento, medicamentos, indicaciones y vinculacion.
- Combinar la busqueda con los filtros existentes Todo, Consultas y Recetas.
- Mostrar un estado vacio contextual cuando no existan coincidencias.
- Permitir limpiar la busqueda rapidamente.

## Capabilities

### New Capabilities

### Modified Capabilities

- `patient-clinical-timeline`: La linea de tiempo clinica permite buscar eventos por texto ademas de filtrar por tipo.

## Impact

- `app/pacientes/[id]/page.tsx`: estado local de busqueda y filtrado textual de eventos.
- `tests/playwright/consultorio.spec.ts`: cobertura de busqueda combinada con filtros.
- Sin cambios de esquema PocketBase, migraciones ni scripts.
