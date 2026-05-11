## Why

La fusion de pacientes ya es segura, pero la decision todavia requiere abrir fichas separadas para entender el contexto clinico y operativo de cada registro. Mostrar actividad reciente directamente en la comparacion reduce errores al elegir el paciente principal.

## What Changes

- Enriquecer la comparacion de duplicados con las ultimas actividades de cada paciente.
- Mostrar ultimos turnos, ultimas consultas y ultimas recetas junto a los conteos existentes.
- Mantener la fusion sin cambios de esquema ni cambios en la reasignacion de referencias.
- Cubrir la mejora en la prueba Playwright del flujo administrativo.

## Capabilities

### New Capabilities

### Modified Capabilities

- `patient-duplicate-management`: la comparacion previa a fusion muestra actividad reciente, no solo datos administrativos y conteos.

## Impact

- API: `app/api/pacientes/duplicados/route.ts` devolvera actividad reciente en el resumen de cada paciente.
- UI: `app/pacientes/duplicados/page.tsx` mostrara listas compactas de turnos, consultas y recetas recientes.
- Pruebas: `tests/playwright/consultorio.spec.ts` validara que la comparacion muestre actividad reciente antes de fusionar.
