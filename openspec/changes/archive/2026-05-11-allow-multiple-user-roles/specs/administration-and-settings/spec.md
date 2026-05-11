## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Acceso admin a permisos
El sistema SHALL restringir `/permisos` y sus APIs a usuarios que incluyan el rol `admin` entre sus roles.

#### Scenario: Usuario admin
- **WHEN** un usuario con rol `admin` abre `/permisos`
- **THEN** el sistema carga usuarios, permisos por rol y configuracion de consultas

#### Scenario: Usuario no admin
- **WHEN** un usuario autenticado sin rol admin intenta acceder a permisos
- **THEN** el sistema lo redirige a `/`
- **AND** los endpoints admin responden `403`

#### Scenario: Usuario admin con varios roles
- **WHEN** un usuario tiene roles `admin` y `medico`
- **THEN** puede abrir `/permisos`
- **AND** las APIs administrativas aceptan su token autenticado

### Requirement: Gestion de usuarios
El sistema SHALL permitir a administradores crear usuarios y cambiar roles multiples.

#### Scenario: Crear usuario
- **WHEN** un admin envia email, nombre opcional y al menos un rol valido a `POST /api/usuarios`
- **THEN** el sistema crea un usuario verificado en PocketBase
- **AND** asigna una contrasena aleatoria porque el ingreso esperado es Google OAuth
- **AND** guarda todos los roles validos seleccionados

#### Scenario: Cambiar roles
- **WHEN** un admin envia `userId` y roles validos a `PATCH /api/usuarios/role`
- **THEN** el sistema actualiza los roles del usuario
- **AND** devuelve id, email, nombre y roles actualizados

#### Scenario: Compatibilidad con rol unico
- **WHEN** un cliente envia un unico `role` valido durante la transicion
- **THEN** el sistema lo normaliza como una lista de roles con un elemento
- **AND** devuelve la representacion de roles multiples

### Requirement: Gestion de permisos por rol
El sistema SHALL permitir a administradores persistir permisos para `medico` y `secretaria`.

#### Scenario: Cargar permisos
- **WHEN** se llama `GET /api/permisos`
- **THEN** el sistema devuelve usuarios ordenados por email
- **AND** devuelve los roles multiples normalizados de cada usuario
- **AND** devuelve permisos normalizados por rol administrable

#### Scenario: Guardar permisos
- **WHEN** un admin guarda permisos para un rol administrable
- **THEN** el sistema filtra permisos desconocidos
- **AND** crea o actualiza el registro correspondiente en `role_permissions`
