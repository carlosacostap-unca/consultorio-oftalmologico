## Why

El informe clínico imprimible puede indicar “Sin antecedentes activos” en consultas antiguas aunque la revisión de esa misma consulta muestre correctamente una enfermedad de base vigente en el paciente. Esta inconsistencia fue confirmada en producción como deuda preexistente y puede provocar que un documento clínico omita información relevante.

## What Changes

- Hacer que el informe clínico de una consulta resuelva los antecedentes con el mismo contrato usado por la vista de revisión: combinar el registro histórico de la consulta con los antecedentes actuales del paciente.
- Mantener visibles tanto los antecedentes conservados en la consulta como los que estén activos en la ficha del paciente, incluida la observación libre según la prioridad ya definida.
- Agregar cobertura automatizada para una consulta legacy sin banderas propias cuyo paciente sí tenga una enfermedad de base.
- Mantener el alcance en lectura y presentación; no modificar registros clínicos existentes.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `clinical-consultations`: el informe clínico imprimible deberá presentar antecedentes coherentes con la revisión de la consulta, incluso para registros legacy incompletos.

## Impact

- Afecta la carga y presentación de `app/consultas/[id]/imprimir/page.tsx`, el uso compartido de `lib/clinical-antecedents.ts` y sus pruebas focalizadas.
- No cambia APIs públicas, dependencias ni permisos.
- No requiere cambios de esquema de PocketBase, migraciones, seeds ni scripts de importación.
