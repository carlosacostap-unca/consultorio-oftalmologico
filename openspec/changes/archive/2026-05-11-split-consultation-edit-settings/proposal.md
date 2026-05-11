## Why

La pantalla de Permisos esta mezclando dos responsabilidades administrativas: matriz de permisos y configuracion de edicion de consultas. Separarlas mejora la navegacion de Configuracion y deja cada pantalla con una tarea clara.

## What Changes

- Agregar una pantalla administrativa `/edicion-consultas` con la configuracion de dias permitidos para editar consultas.
- Agregar la opcion `Edicion de consultas` dentro del menu Configuracion para usuarios con rol activo `admin`.
- Quitar la seccion de configuracion de consultas de `/permisos`.
- Mantener `/permisos` solo con las secciones de permisos para Medico y Secretaria.
- Reutilizar `/api/configuracion` y la validacion existente de rol activo `admin`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `administration-and-settings`: separar la configuracion de edicion de consultas en una pantalla propia.
- `access-and-navigation`: agregar la opcion Edicion de consultas al menu Configuracion.

## Impact

- Afecta `components/Sidebar.tsx`, `app/permisos/page.tsx` y agrega `app/edicion-consultas/page.tsx`.
- No requiere cambios de esquema ni migraciones en PocketBase.
