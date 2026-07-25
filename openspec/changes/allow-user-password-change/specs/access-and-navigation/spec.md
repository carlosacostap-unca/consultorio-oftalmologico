## ADDED Requirements

### Requirement: Cambio de contrasena desde perfil lateral
El sistema SHALL permitir que un usuario autenticado cambie su propia contrasena desde el perfil del menu lateral.

#### Scenario: Usuario abre opcion de cambio de contrasena
- **WHEN** un usuario autenticado hace click en el bloque de perfil del menu lateral donde ve su usuario y email
- **THEN** el sistema muestra la opcion "Cambiar contrasena"

#### Scenario: Usuario abre modal de cambio de contrasena
- **WHEN** el usuario ejecuta "Cambiar contrasena"
- **THEN** el sistema muestra un modal con campos para nueva contrasena y repeticion
- **AND** el modal permite cancelar sin modificar la contrasena

#### Scenario: Repeticion incorrecta en cambio de contrasena
- **WHEN** el usuario ingresa una nueva contrasena y una repeticion distinta
- **THEN** el sistema rechaza el envio
- **AND** muestra un mensaje indicando que las contrasenas no coinciden
- **AND** no actualiza la contrasena del usuario

#### Scenario: Cambio de contrasena exitoso
- **WHEN** el usuario ingresa una contrasena valida y la repite correctamente
- **THEN** el sistema actualiza la contrasena del usuario autenticado
- **AND** mantiene la sesion activa
- **AND** cierra el modal mostrando confirmacion de exito
