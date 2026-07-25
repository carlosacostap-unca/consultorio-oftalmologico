## Why

Al crear una consulta nueva, el formulario medico envia campos clinicos que la coleccion `consultas` de PocketBase puede no tener, provocando un rechazo de guardado con un mensaje generico. Esto bloquea la atencion clinica en rol medico y oculta la causa operativa real.

## What Changes

- Asegurar en el esquema de PocketBase los campos clinicos `add_value` y `biomicroscopia` de la coleccion `consultas`.
- Mantener esos datos al crear y editar consultas, segun la especificacion clinica existente.
- Mostrar un error de guardado mas accionable cuando PocketBase rechaza la consulta por esquema o validacion.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `clinical-consultations`: explicitar que los campos clinicos que el formulario registra deben existir en el esquema operativo de `consultas` y que los errores de guardado deben ser accionables.

## Impact

- PocketBase: coleccion `consultas`, campos `add_value` y `biomicroscopia`.
- Scripts: nuevo asegurador de esquema y cadena `schema:test`.
- App: `POST /api/consultas` y mensaje de error del formulario de nueva consulta.
