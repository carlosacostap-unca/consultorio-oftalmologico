## MODIFIED Requirements

### Requirement: Acceso administrativo a PocketBase
El sistema SHALL usar helpers server-side para operar con privilegios administrativos cuando corresponda y SHALL recuperar una operación rechazada por un token administrativo expirado sin debilitar la autorización del usuario solicitante.

#### Scenario: Token admin configurado
- **WHEN** existe `POCKETBASE_ADMIN_TOKEN`
- **THEN** el sistema lo usa para llamadas administrativas

#### Scenario: Credenciales admin configuradas
- **WHEN** no existe token admin pero existen email y password admin
- **THEN** el sistema obtiene token mediante `/api/collections/_superusers/auth-with-password`
- **AND** si falla intenta `/api/admins/auth-with-password` para compatibilidad

#### Scenario: Token administrativo rechazado
- **WHEN** PocketBase responde `401` a una llamada administrativa y existen email y password admin configurados
- **THEN** el sistema descarta el token rechazado
- **AND** obtiene un nuevo token administrativo
- **AND** reintenta una sola vez la operación original

#### Scenario: Renovación sin credenciales
- **WHEN** PocketBase rechaza el token administrativo y no existen credenciales para renovarlo
- **THEN** el sistema informa el fallo sin repetir indefinidamente la solicitud

#### Scenario: Autorización del usuario solicitante
- **WHEN** un usuario sin rol activo `admin` intenta invocar una ruta administrativa
- **THEN** el sistema responde `403`
- **AND** no usa la renovación del token server-side para eludir esa restricción
