## ADDED Requirements

### Requirement: Configuracion de contrasena despues de Google
El sistema SHALL exigir que un usuario autenticado por Google configure una contrasena propia antes de acceder al panel principal cuando su registro no indique una contrasena configurada por el usuario.

#### Scenario: Usuario Google sin contrasena configurada
- **WHEN** un usuario inicia sesion correctamente con Google y su registro tiene `password_configured` distinto de `true`
- **THEN** el sistema muestra una pantalla intermedia para ingresar una nueva contrasena
- **AND** no muestra el panel principal hasta que la contrasena sea guardada correctamente

#### Scenario: Repeticion de contrasena incorrecta
- **WHEN** el usuario ingresa una contrasena y una repeticion distinta en la pantalla intermedia
- **THEN** el sistema rechaza el envio
- **AND** muestra un mensaje indicando que las contrasenas no coinciden
- **AND** mantiene al usuario en la pantalla intermedia

#### Scenario: Contrasena guardada correctamente
- **WHEN** el usuario ingresa una contrasena valida y la repite correctamente
- **THEN** el sistema guarda la contrasena para el usuario autenticado
- **AND** marca el registro con `password_configured` en `true`
- **AND** muestra el panel principal con el rol activo resuelto

#### Scenario: Usuario con contrasena configurada
- **WHEN** un usuario inicia sesion y su registro tiene `password_configured` en `true`
- **THEN** el sistema muestra el panel principal sin pedir configuracion de contrasena

#### Scenario: Cerrar sesion desde configuracion de contrasena
- **WHEN** un usuario esta en la pantalla intermedia de configuracion de contrasena y ejecuta "Cerrar sesion"
- **THEN** el sistema limpia `pb.authStore`
- **AND** vuelve a mostrar la pantalla inicial de login

### Requirement: Login con email y contrasena conserva acceso
El sistema SHALL permitir que usuarios con contrasena configurada ingresen mediante email y contrasena desde la pantalla inicial.

#### Scenario: Login exitoso con email y contrasena
- **WHEN** un usuario ingresa email y contrasena validos
- **THEN** el sistema autentica contra PocketBase
- **AND** marca el registro con `password_configured` en `true` si aun no lo estaba
- **AND** muestra el panel principal con el rol activo resuelto

#### Scenario: Login fallido con email y contrasena
- **WHEN** un usuario ingresa email o contrasena invalidos
- **THEN** el sistema conserva al usuario en la pantalla inicial
- **AND** muestra un mensaje de error sin modificar `password_configured`
