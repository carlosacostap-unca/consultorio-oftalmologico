## Why

El medico ya puede abrir la ficha del paciente, pero durante la atencion necesita una lectura mas rapida de continuidad clinica: ultimas consultas, recetas recientes y accesos directos para imprimir o volver al contexto clinico.

## What Changes

- Enriquecer la ficha en modo lectura con metricas clinicas y acciones directas.
- Mostrar una seccion de continuidad clinica con consultas recientes y acceso a cada consulta.
- Mejorar recetas recientes con acciones para ver e imprimir.
- Agregar accion para imprimir la ficha del paciente desde la pantalla.
- Mantener el formulario de edicion existente.

## Capabilities

### Modified Capabilities
- `patient-management`: Mejora la ficha clinica del paciente para uso medico.

## Impact

- `app/pacientes/[id]/page.tsx`
- `tests/playwright/consultorio.spec.ts`
- `openspec/specs/patient-management/spec.md`
