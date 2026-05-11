## MODIFIED Requirements

### Requirement: Acceso admin a permisos
El sistema SHALL restringir `/permisos` y sus APIs a usuarios cuyo rol activo validado sea `admin`.

#### Scenario: Usuario admin activo
- **WHEN** un usuario con rol `admin` asignado y rol activo `admin` abre `/permisos`
- **THEN** el sistema carga usuarios, permisos por rol y configuracion de consultas

#### Scenario: Usuario admin asignado pero rol operativo activo
- **WHEN** un usuario con roles `admin` y `medico` tiene rol activo `medico` e intenta acceder a permisos
- **THEN** el sistema lo redirige a `/`
- **AND** los endpoints admin responden `403`

#### Scenario: Rol activo no asignado
- **WHEN** un request administrativo informa un rol activo que no esta asignado al usuario autenticado
- **THEN** el endpoint responde `403`

#### Scenario: Usuario no admin
- **WHEN** un usuario autenticado sin rol admin intenta acceder a permisos
- **THEN** el sistema lo redirige a `/`
- **AND** los endpoints admin responden `403`
