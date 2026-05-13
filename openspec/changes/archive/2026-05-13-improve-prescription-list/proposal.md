## Why

El modulo de recetas ya permite crear, ver e imprimir recetas, pero el listado todavia es limitado para el trabajo diario del medico. Falta encontrar recetas por documento, ficha o medicamento, distinguir rapidamente si estan vinculadas a consulta y acceder a acciones clinicas sin abrir primero la receta.

## What Changes

- Mejorar el filtro del listado de recetas para buscar por paciente, documento, ficha, medicamento e indicaciones.
- Agregar filtro por vinculacion con consulta.
- Mostrar en la tabla si la receta esta vinculada a una consulta o es libre.
- Agregar acciones rapidas para ver, imprimir, editar, volver a consulta y abrir paciente.
- Mejorar estados vacios del listado.
- Cubrir el flujo con Playwright.

## Capabilities

### Modified Capabilities
- `prescriptions`: Mejora el listado operativo de recetas.

## Impact

- `app/recetas/page.tsx`
- `tests/playwright/consultorio.spec.ts`
- `openspec/specs/prescriptions/spec.md`
