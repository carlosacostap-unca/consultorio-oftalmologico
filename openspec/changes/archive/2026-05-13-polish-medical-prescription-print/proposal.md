## Why

La receta medica ya puede emitirse desde una consulta y abrirse en modo imprimible, pero la hoja impresa todavia queda corta para el uso clinico diario. El medico necesita que la receta muestre datos completos del paciente, contexto de la consulta y acciones claras para volver al flujo clinico.

## What Changes

- Mejorar la vista imprimible de receta medica con datos completos del paciente.
- Mostrar contexto de consulta vinculada cuando exista, incluyendo motivo, diagnostico y tratamiento.
- Agregar acciones para imprimir, volver a la receta y volver a la consulta vinculada.
- Ajustar la prueba Playwright del flujo medico para verificar la receta imprimible enriquecida.
- Sin cambios de esquema PocketBase.

## Capabilities

### Modified Capabilities
- `prescriptions`: Mejora la impresion y continuidad de recetas medicas.

## Impact

- UI de `app/recetas/[id]/imprimir/page.tsx`.
- Pruebas Playwright del flujo medico con receta.
- Especificacion OpenSpec de recetas.
