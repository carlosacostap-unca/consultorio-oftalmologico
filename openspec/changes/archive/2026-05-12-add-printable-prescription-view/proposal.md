## Why

El flujo clinico ya permite crear recetas desde una consulta y ver la receta creada, pero la vista actual se comporta como un formulario en modo lectura y no ofrece una impresion clara de receta medica. El medico necesita revisar, imprimir y volver al contexto clinico con pocos pasos.

## What Changes

- Mejorar la vista de receta existente con un resumen legible de paciente, fecha, medicamentos e indicaciones.
- Agregar acciones visibles para imprimir receta medica, volver a la consulta vinculada, imprimir anteojos cuando corresponda y abrir el paciente.
- Crear una ruta imprimible para receta medica en `/recetas/[id]/imprimir`.
- Mantener la edicion actual de recetas.
- Sin cambios de esquema PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `prescriptions`: Mejora la lectura e impresion de recetas medicas.

## Impact

- UI de `app/recetas/[id]/page.tsx`.
- Nueva ruta `app/recetas/[id]/imprimir/page.tsx`.
- Pruebas Playwright del flujo medico con receta.
- Especificacion OpenSpec de recetas.
