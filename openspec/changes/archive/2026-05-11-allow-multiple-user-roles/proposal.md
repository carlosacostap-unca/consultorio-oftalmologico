## Why

En el consultorio una misma persona puede cubrir mas de una funcion operativa, por ejemplo medico y secretaria, pero hoy el sistema solo permite un rol por usuario. Permitir multiples roles evita crear usuarios duplicados y hace que la gestion de permisos refleje mejor la organizacion real del equipo.

## What Changes

- Los usuarios podran tener uno o mas roles entre `admin`, `medico` y `secretaria`.
- La administracion de usuarios permitira asignar, mostrar y guardar multiples roles por usuario.
- La autorizacion administrativa considerara a un usuario admin cuando cualquiera de sus roles sea `admin`.
- Los permisos efectivos de un usuario con roles operativos se calcularan como la union de permisos de todos sus roles asignados.
- Se mantendra compatibilidad durante la migracion desde el campo actual de rol unico.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `administration-and-settings`: cambia la gestion de usuarios, roles, permisos efectivos y endpoints administrativos para admitir multiples roles por usuario.
- `access-and-navigation`: cambia la deteccion de acceso admin en la navegacion lateral para usuarios con el rol `admin` entre varios roles.
- `data-import-and-migration`: cambia la migracion de permisos/usuarios para inicializar o normalizar roles multiples sin perder el rol unico existente.

## Impact

- PocketBase: revisar el esquema de la coleccion `users` para almacenar roles multiples, con migracion desde `role`.
- APIs: actualizar `POST /api/usuarios`, `PATCH /api/usuarios/role`, `GET /api/permisos` y helpers server-side de autorizacion.
- UI: actualizar `/permisos` y la barra lateral para mostrar/editar multiples roles.
- Tipos y permisos: adaptar `AppUser`, utilidades de roles y calculo de permisos efectivos.
- Migracion/scripts: agregar un paso idempotente que copie el rol unico existente a la nueva representacion de roles multiples.
