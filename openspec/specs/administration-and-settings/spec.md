# Administration And Settings Specification

## Purpose
Define la administracion de usuarios, roles, permisos operativos y configuracion del sistema.
## Requirements
### Requirement: Roles de usuario
El sistema SHALL reconocer los roles `admin`, `medico` y `secretaria`, y SHALL permitir asignar uno o mas roles validos a cada usuario.

#### Scenario: Etiquetas de roles
- **WHEN** el sistema muestra roles
- **THEN** usa etiquetas Admin, Medico y Secretaria

#### Scenario: Roles administrables
- **WHEN** se gestionan permisos por rol
- **THEN** solo `medico` y `secretaria` son roles administrables
- **AND** `admin` conserva acceso administrativo fuera de esa matriz

#### Scenario: Roles multiples
- **WHEN** un admin asigna varios roles validos a un usuario
- **THEN** el sistema persiste todos los roles seleccionados
- **AND** rechaza listas vacias o roles desconocidos

### Requirement: Matriz de permisos
El sistema SHALL definir permisos por dominios operativos.

#### Scenario: Permisos disponibles
- **WHEN** se carga la pagina de permisos
- **THEN** el sistema muestra permisos de pacientes, consultas, turnos y administracion
- **AND** incluye gestionar mutuales y recetas dentro de administracion

#### Scenario: Permisos por defecto
- **WHEN** no existe configuracion persistida para un rol administrable
- **THEN** el sistema usa los permisos por defecto definidos para `medico` o `secretaria`

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

### Requirement: Gestion de permisos por rol
El sistema SHALL permitir a administradores persistir permisos para `medico` y `secretaria` desde `/permisos`.

#### Scenario: Cargar permisos
- **WHEN** se llama `GET /api/permisos`
- **THEN** el sistema devuelve permisos normalizados por rol administrable

#### Scenario: Guardar permisos
- **WHEN** un admin guarda permisos para un rol administrable
- **THEN** el sistema filtra permisos desconocidos
- **AND** crea o actualiza el registro correspondiente en `role_permissions`

### Requirement: Configuracion de edicion de consultas
El sistema SHALL administrar la cantidad de dias permitidos para editar consultas.

#### Scenario: Cargar configuracion
- **WHEN** un usuario autenticado llama `GET /api/configuracion`
- **THEN** el sistema devuelve `consultaEditLimitDays`
- **AND** si falla la lectura devuelve el valor por defecto 7

#### Scenario: Guardar configuracion
- **WHEN** un admin llama `PATCH /api/configuracion` con `consultaEditLimitDays`
- **THEN** el sistema normaliza el valor a entero no negativo
- **AND** crea o actualiza la clave `consulta_edit_limit_days` en `system_settings`

### Requirement: Acceso administrativo a PocketBase
El sistema SHALL usar helpers server-side para operar con privilegios administrativos cuando corresponda.

#### Scenario: Token admin configurado
- **WHEN** existe `POCKETBASE_ADMIN_TOKEN`
- **THEN** el sistema lo usa para llamadas administrativas

#### Scenario: Credenciales admin configuradas
- **WHEN** no existe token admin pero existen email y password admin
- **THEN** el sistema obtiene token mediante `/api/admins/auth-with-password`
- **AND** si falla intenta `/api/collections/_superusers/auth-with-password`

### Requirement: Permisos efectivos por multiples roles
El sistema SHALL calcular los permisos efectivos de un usuario como la union de permisos de todos sus roles administrables asignados.

#### Scenario: Usuario medico y secretaria
- **WHEN** un usuario tiene roles `medico` y `secretaria`
- **THEN** el sistema considera permitidas las acciones habilitadas para cualquiera de esos roles
- **AND** no duplica permisos repetidos en la respuesta o evaluacion

#### Scenario: Usuario admin con roles operativos
- **WHEN** un usuario tiene rol `admin` y tambien roles operativos
- **THEN** el sistema conserva el acceso administrativo por `admin`
- **AND** los permisos operativos se calculan solo desde roles administrables

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

### Requirement: Pantalla de edicion de consultas
El sistema SHALL permitir administrar la cantidad de dias permitidos para editar consultas desde `/edicion-consultas`.

#### Scenario: Cargar pantalla de edicion de consultas
- **WHEN** un admin con rol activo `admin` abre `/edicion-consultas`
- **THEN** el sistema muestra solo la seccion de configuracion de consultas
- **AND** carga el valor `consultaEditLimitDays`

#### Scenario: Guardar configuracion de edicion de consultas
- **WHEN** un admin guarda la configuracion desde `/edicion-consultas`
- **THEN** el sistema persiste `consultaEditLimitDays` usando `/api/configuracion`
- **AND** mantiene el valor actualizado en pantalla

#### Scenario: Usuario sin rol activo admin
- **WHEN** un usuario sin rol activo `admin` intenta abrir `/edicion-consultas`
- **THEN** el sistema lo redirige a `/`
