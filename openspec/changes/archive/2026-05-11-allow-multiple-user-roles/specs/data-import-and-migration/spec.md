## MODIFIED Requirements

### Requirement: Migracion de permisos y configuracion
El sistema SHALL proveer scripts para inicializar permisos por rol, roles multiples de usuarios y configuracion del sistema.

#### Scenario: Migrar permisos
- **WHEN** se ejecuta la migracion de roles y permisos
- **THEN** el script crea o actualiza registros de `role_permissions` para roles administrables

#### Scenario: Migrar roles multiples de usuarios
- **WHEN** se ejecuta la migracion de roles y permisos
- **THEN** el script asegura un campo multi-rol `roles` en la coleccion `users`
- **AND** copia el valor legacy `role` de cada usuario a `roles` cuando corresponda
- **AND** conserva la migracion idempotente para ejecuciones repetidas

#### Scenario: Migrar configuracion
- **WHEN** se ejecuta la migracion de configuracion
- **THEN** el script asegura la clave `consulta_edit_limit_days` en `system_settings`
- **AND** usa 7 como valor inicial si no existe
