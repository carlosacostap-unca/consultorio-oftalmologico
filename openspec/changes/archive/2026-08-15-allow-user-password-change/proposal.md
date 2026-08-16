## Why

Los usuarios ya pueden configurar una contrasena inicial cuando ingresan con Google, pero necesitan una forma simple de cambiarla despues desde su sesion. El lugar natural es el perfil del menu lateral, donde ya ven su usuario, email, rol activo y cierre de sesion.

## What Changes

- Hacer clickeable el bloque de perfil del menu lateral donde se muestran usuario y email.
- Mostrar una opcion "Cambiar contrasena" asociada a ese perfil.
- Abrir un modal para ingresar la nueva contrasena y repetirla.
- Validar coincidencia y longitud minima antes de guardar.
- Guardar la nueva contrasena para el usuario autenticado sin modificar roles ni otros datos.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `access-and-navigation`: agrega gestion de contrasena desde el perfil del menu lateral autenticado.

## Impact

- `components/Sidebar.tsx`: nuevo menu de perfil, modal y estados de cambio de contrasena.
- `app/api/usuarios/password/route.ts`: ampliar el endpoint autenticado para cambio voluntario de contrasena.
- Pruebas Playwright: cubrir apertura del modal, validacion de repeticion y guardado exitoso.
