## Why

El sistema ya permite ingresar con Google OAuth, pero tambien debe sostener el acceso con email y contrasena para casos donde el usuario necesite iniciar sesion sin Google. Cuando un usuario entra por Google y todavia no tiene una contrasena propia, el sistema debe completar esa configuracion antes de mostrar el panel principal.

## What Changes

- Detectar, despues de un login exitoso con Google, si el usuario autenticado necesita configurar una contrasena.
- Mostrar una pantalla intermedia antes del panel principal para ingresar y repetir la nueva contrasena.
- Validar que ambas contrasenas coincidan y cumplan reglas minimas antes de guardarlas.
- Guardar la contrasena para el usuario autenticado, manteniendo activa la sesion y continuando al panel principal.
- Conservar el login con email y contrasena existente para usuarios que ya tengan una contrasena configurada.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `access-and-navigation`: agrega el requisito de completar la configuracion de contrasena despues de Google OAuth cuando el usuario aun no tiene una contrasena propia.

## Impact

- `app/page.tsx`: nuevo estado post-login y pantalla intermedia antes del dashboard.
- Nuevo endpoint o accion server-side autenticada para que el usuario actual establezca su contrasena.
- PocketBase `users`: se actualizara el registro autenticado con `password` y `passwordConfirm` cuando corresponda.
- Pruebas Playwright: cubrir el flujo de usuario que requiere contrasena y el caso de validacion por repeticion incorrecta.
