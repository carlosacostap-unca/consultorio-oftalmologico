## Why

Las pantallas de recetas cargan todos los pacientes al abrir para poblar un selector. En produccion esto puede ser lento y generar carga innecesaria sobre PocketBase, especialmente con padrones grandes.

## What Changes

- Reemplazar el selector de pacientes en nueva receta por busqueda/autocompletado paginado.
- Reemplazar el selector de pacientes en edicion de receta por busqueda/autocompletado paginado.
- Cargar puntualmente el paciente seleccionado cuando la receta viene por URL o cuando se abre una receta existente.
- Mantener la carga de consultas del paciente seleccionado.
- Sin cambios de esquema PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `prescriptions`: Optimiza seleccion de pacientes en recetas sin cargar todo el padron.

## Impact

- UI y carga de datos en `app/recetas/nueva/page.tsx`.
- UI y carga de datos en `app/recetas/[id]/page.tsx`.
- Pruebas Playwright del flujo medico con receta.
- Especificacion OpenSpec de recetas.
