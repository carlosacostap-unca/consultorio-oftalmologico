## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Acceso admin a permisos
El sistema SHALL restringir `/permisos` y sus APIs a usuarios cuyo rol activo validado sea `admin`.

#### Scenario: Usuario admin activo
- **WHEN** un usuario con rol `admin` asignado y rol activo `admin` abre `/permisos`
- **THEN** el sistema carga permisos por rol
- **AND** no muestra la configuracion de edicion de consultas

### Requirement: Gestion de permisos por rol
El sistema SHALL permitir a administradores persistir permisos para `medico` y `secretaria` desde `/permisos`.

#### Scenario: Cargar permisos
- **WHEN** se llama `GET /api/permisos`
- **THEN** el sistema devuelve permisos normalizados por rol administrable

#### Scenario: Guardar permisos
- **WHEN** un admin guarda permisos para un rol administrable
- **THEN** el sistema filtra permisos desconocidos
- **AND** crea o actualiza el registro correspondiente en `role_permissions`
