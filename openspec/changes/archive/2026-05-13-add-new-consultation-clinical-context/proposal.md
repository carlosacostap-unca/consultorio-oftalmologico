## Why

Al iniciar una consulta, el medico necesita contexto clinico inmediato del paciente sin salir del formulario. Hoy la ficha del paciente concentra esa continuidad, pero durante la atencion obliga a navegar fuera de la carga de la consulta.

## What Changes

- Mostrar en `/consultas/nueva` un contexto clinico compacto del paciente seleccionado.
- Incluir ultimas consultas, diagnosticos/tratamientos recientes y recetas recientes cuando existan.
- Mantener el formulario de consulta y el guardado actual sin cambios de esquema.
- Permitir abrir consultas o recetas previas desde el contexto clinico.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: La nueva consulta debe mostrar continuidad clinica previa del paciente seleccionado.

## Impact

- Afecta `app/consultas/nueva/page.tsx`.
- Afecta cobertura Playwright en `tests/playwright/consultorio.spec.ts`.
- No requiere migraciones ni cambios de colecciones PocketBase.
