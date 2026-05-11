## Why

Los usuarios con mas de un rol necesitan entrar al sistema con una funcion concreta para trabajar con una interfaz y permisos acordes a esa tarea. Elegir y cambiar el rol activo evita que un usuario con permisos amplios vea acciones administrativas cuando esta trabajando como medico o secretaria.

## What Changes

- Al iniciar sesion, el sistema resolvera automaticamente el rol activo; si el usuario tiene `medico`, lo priorizara como rol inicial.
- Si el usuario tiene un solo rol asignado, el sistema seleccionara ese rol automaticamente.
- El menu lateral mostrara avatar o inicial, nombre, email y rol activo en la parte inferior.
- Desde ese perfil del menu lateral se podra cambiar el rol activo entre los roles asignados del usuario.
- La navegacion y las acciones administrativas se evaluaran contra el rol activo, no solo contra los roles asignados.
- El rol activo sera una preferencia de sesion local; no requiere migracion ni cambios en PocketBase.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `access-and-navigation`: agrega seleccion de rol activo al login, persistencia local de la eleccion y selector de cambio de rol en la interfaz.
- `administration-and-settings`: ajusta la autorizacion administrativa para respetar el rol activo en endpoints sensibles.

## Impact

- UI: pantalla inicial, barra lateral y flujo de sesion.
- Estado cliente: persistencia local del rol activo por usuario autenticado.
- APIs: endpoints administrativos deberan validar el rol activo enviado por el cliente contra los roles asignados del usuario.
- Seguridad: un usuario con rol admin asignado solo opera como admin cuando el rol activo tambien es `admin`.
