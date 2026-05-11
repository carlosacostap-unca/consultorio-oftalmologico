## Why

La opcion Usuarios del menu de configuracion debe llevar a una pantalla dedicada para administrar cuentas, en lugar de depender de una seccion dentro de Permisos. Esto separa mejor la gestion de usuarios de la matriz de permisos y deja mas clara la navegacion administrativa.

## What Changes

- Agregar la pantalla `/usuarios` para listar usuarios, crear nuevos y gestionar sus roles asignados.
- Cambiar el menu lateral admin para que `Usuarios` navegue a `/usuarios` y `Permisos` quede enfocado en permisos/configuracion.
- Exponer `GET /api/usuarios` para obtener usuarios normalizados con multiples roles.
- Mantener la proteccion administrativa con rol activo `admin` y la regla que impide que un admin se quite a si mismo el rol admin.
- Quitar la gestion de usuarios de la pantalla `/permisos`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `administration-and-settings`: separar la gestion de usuarios en una pantalla y endpoint propios.
- `access-and-navigation`: actualizar la navegacion admin para llevar Usuarios a `/usuarios`.

## Impact

- Afecta `components/Sidebar.tsx`, `app/permisos/page.tsx`, `app/usuarios/page.tsx` y endpoints bajo `app/api/usuarios`.
- No requiere migracion de PocketBase ni cambios de esquema.
- Reutiliza los helpers existentes de roles multiples y rol activo.
