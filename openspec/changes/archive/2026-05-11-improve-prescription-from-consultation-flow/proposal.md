## Why

Despues de una consulta, el medico necesita emitir recetas sin perder contexto del paciente ni de la consulta que acaba de cerrar. La pantalla actual permite crear una receta vinculada, pero no muestra claramente el contexto clinico y al guardar redirige de inmediato.

## What Changes

- Mostrar contexto de paciente y consulta cuando `/recetas/nueva` se abre con `consulta_id` y `paciente_id`.
- Diferenciar visualmente la receta medica del acceso a receta de anteojos cuando existe consulta vinculada.
- Reemplazar la redireccion automatica al guardar por una confirmacion con acciones.
- Permitir abrir la receta creada, volver a la consulta, imprimir anteojos o cargar otra receta desde la confirmacion.
- Mantener la creacion libre de receta sin consulta asociada.
- Sin cambios de esquema PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `prescriptions`: Mejora la creacion de recetas desde consulta y las acciones posteriores al guardado.

## Impact

- UI de `app/recetas/nueva/page.tsx`.
- Pruebas Playwright del flujo medico desde jornada diaria.
- Especificacion OpenSpec de recetas.
