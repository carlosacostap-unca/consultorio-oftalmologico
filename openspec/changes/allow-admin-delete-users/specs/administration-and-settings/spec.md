## MODIFIED Requirements

### Requirement: Gestion de usuarios
El sistema SHALL permitir a administradores crear usuarios, cambiar multiples roles y eliminar usuarios desde la pantalla `/usuarios`, preservando protecciones contra perdida accidental de la cuenta admin activa.

#### Scenario: Crear usuario
- **WHEN** un admin envia email, nombre opcional y uno o mas roles validos a `POST /api/usuarios`
- **THEN** el sistema crea un usuario verificado en PocketBase
- **AND** asigna una contrasena aleatoria porque el ingreso esperado es Google OAuth

#### Scenario: Cambiar roles
- **WHEN** un admin envia `userId` y roles validos a `PATCH /api/usuarios/role`
- **THEN** el sistema actualiza los roles del usuario
- **AND** devuelve id, email, nombre, rol legacy y roles actualizados

#### Scenario: Eliminar usuario
- **WHEN** un admin confirma la eliminacion de un usuario distinto a su propia cuenta
- **THEN** el sistema elimina ese usuario de PocketBase
- **AND** lo quita del listado de usuarios

#### Scenario: Admin no puede eliminar su propia cuenta
- **WHEN** un admin intenta eliminar su propio usuario
- **THEN** el sistema impide la accion
- **AND** conserva la cuenta activa

### Requirement: Pantalla de gestion de usuarios
El sistema SHALL permitir que administradores con rol activo `admin` gestionen usuarios desde `/usuarios`, incluyendo creacion, roles y eliminacion de usuarios permitidos.

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

#### Scenario: Eliminar usuario desde Usuarios
- **WHEN** un admin elimina un usuario distinto a si mismo desde `/usuarios`
- **THEN** la pantalla pide confirmacion
- **AND** si la API confirma el borrado, quita el usuario del listado

#### Scenario: Admin no puede quitar su propio rol admin
- **WHEN** un admin intenta quitarse a si mismo el rol `admin` desde `/usuarios`
- **THEN** el sistema impide la accion
- **AND** conserva el rol `admin` asignado

#### Scenario: Admin no puede eliminarse desde Usuarios
- **WHEN** un admin ve su propio usuario en `/usuarios`
- **THEN** la accion de eliminar no esta disponible para su propia cuenta

### Requirement: API de usuarios
El sistema SHALL exponer endpoints administrativos de usuarios protegidos por rol activo `admin`, incluyendo consulta, creacion, actualizacion de roles y eliminacion.

#### Scenario: Obtener usuarios
- **WHEN** un admin con rol activo `admin` llama `GET /api/usuarios`
- **THEN** el sistema devuelve usuarios ordenados por email
- **AND** cada usuario incluye `id`, `email`, `name`, `role` y `roles`

#### Scenario: Eliminar usuario por API
- **WHEN** un admin con rol activo `admin` llama `DELETE /api/usuarios` con `userId` de otro usuario
- **THEN** el sistema elimina ese registro de `users`
- **AND** devuelve confirmacion de borrado

#### Scenario: Bloquear auto-eliminacion por API
- **WHEN** un admin llama `DELETE /api/usuarios` con su propio `userId`
- **THEN** el endpoint responde `400`
- **AND** no elimina la cuenta activa

#### Scenario: Usuario sin rol activo admin
- **WHEN** un usuario autenticado sin rol activo `admin` llama endpoints administrativos de usuarios
- **THEN** el endpoint responde `403`
