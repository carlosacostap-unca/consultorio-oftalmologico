## ADDED Requirements

### Requirement: Pantalla de gestion de usuarios
El sistema SHALL permitir que administradores con rol activo `admin` gestionen usuarios desde `/usuarios`.

#### Scenario: Listar usuarios
- **WHEN** un admin con rol activo `admin` abre `/usuarios`
- **THEN** el sistema muestra usuarios ordenados por email
- **AND** muestra nombre, email y roles asignados para cada usuario

#### Scenario: Crear usuario desde Usuarios
- **WHEN** un admin crea un usuario desde `/usuarios` con email valido y al menos un rol
- **THEN** el sistema crea el usuario verificado en PocketBase
- **AND** agrega el usuario al listado con sus roles normalizados

#### Scenario: Cambiar roles desde Usuarios
- **WHEN** un admin cambia roles de un usuario desde `/usuarios`
- **THEN** el sistema persiste los roles asignados
- **AND** mantiene el campo legacy `role` compatible con los roles asignados

#### Scenario: Admin no puede quitar su propio rol admin
- **WHEN** un admin intenta quitarse a si mismo el rol `admin` desde `/usuarios`
- **THEN** el sistema impide la accion
- **AND** conserva el rol `admin` asignado

### Requirement: API de usuarios
El sistema SHALL exponer endpoints administrativos de usuarios protegidos por rol activo `admin`.

#### Scenario: Obtener usuarios
- **WHEN** un admin con rol activo `admin` llama `GET /api/usuarios`
- **THEN** el sistema devuelve usuarios ordenados por email
- **AND** cada usuario incluye `id`, `email`, `name`, `role` y `roles`

#### Scenario: Usuario sin rol activo admin
- **WHEN** un usuario autenticado sin rol activo `admin` llama endpoints administrativos de usuarios
- **THEN** el endpoint responde `403`

## MODIFIED Requirements

### Requirement: Gestion de usuarios
El sistema SHALL permitir a administradores crear usuarios y cambiar multiples roles desde la pantalla `/usuarios`.

#### Scenario: Crear usuario
- **WHEN** un admin envia email, nombre opcional y uno o mas roles validos a `POST /api/usuarios`
- **THEN** el sistema crea un usuario verificado en PocketBase
- **AND** asigna una contrasena aleatoria porque el ingreso esperado es Google OAuth

#### Scenario: Cambiar roles
- **WHEN** un admin envia `userId` y roles validos a `PATCH /api/usuarios/role`
- **THEN** el sistema actualiza los roles del usuario
- **AND** devuelve id, email, nombre, rol legacy y roles actualizados

### Requirement: Acceso admin a permisos
El sistema SHALL restringir `/permisos` y sus APIs a usuarios cuyo rol activo validado sea `admin`.

#### Scenario: Usuario admin activo
- **WHEN** un usuario con rol `admin` asignado y rol activo `admin` abre `/permisos`
- **THEN** el sistema carga permisos por rol y configuracion de consultas

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
