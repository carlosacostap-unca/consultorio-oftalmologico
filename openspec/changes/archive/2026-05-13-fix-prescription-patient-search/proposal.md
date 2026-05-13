## Why

La busqueda de pacientes en recetas nuevas y editadas incluye el campo `dni` dentro del filtro de PocketBase. La instancia de testing usa `numero_documento` y no expone `dni` como campo de coleccion, por lo que PocketBase devuelve 400 cuando se busca un paciente desde recetas.

## What Changes

- Centralizar el filtro de busqueda activa de pacientes.
- Buscar recetas por nombre, apellido, `numero_documento` y `numero_ficha`, sin depender de un campo `dni` inexistente.
- Mantener la lectura compatible de documentos viejos mediante `patient.dni` cuando venga en un registro expandido.
- Limpiar textos mojibake visibles en pantallas de recetas.
- Reforzar Playwright para detectar errores de consola durante la busqueda de paciente en receta libre.

## Capabilities

### Modified Capabilities
- `prescriptions`: Corrige la busqueda de pacientes al crear o editar recetas.

## Impact

- `lib/patient-merge.ts`
- `app/recetas/nueva/page.tsx`
- `app/recetas/[id]/page.tsx`
- `app/recetas/page.tsx`
- Pruebas Playwright de recetas.
- Especificacion OpenSpec de recetas.
