## MODIFIED Requirements

### Requirement: Acceso administrativo a PocketBase
El sistema SHALL usar helpers server-side para operar con privilegios administrativos cuando corresponda, SHALL renovar preventivamente una credencial administrativa cacheada que esté vencida o próxima a vencer y SHALL recuperar una operación rechazada sin debilitar la autorización del usuario solicitante.

#### Scenario: Token admin configurado y vigente
- **WHEN** existe `POCKETBASE_ADMIN_TOKEN` con una expiración válida posterior al margen preventivo
- **THEN** el sistema lo usa para llamadas administrativas

#### Scenario: Token administrativo cacheado vencido
- **WHEN** el token administrativo cacheado está vencido o vence dentro del margen preventivo
- **THEN** el sistema lo descarta antes de consultar una colección
- **AND** obtiene un token nuevo mediante las credenciales server-side configuradas

#### Scenario: Token administrativo sin expiración verificable
- **WHEN** el token administrativo cacheado no contiene una expiración válida
- **THEN** el sistema no lo reutiliza
- **AND** intenta obtener una credencial administrativa nueva

#### Scenario: Credenciales admin configuradas
- **WHEN** no existe un token administrativo reutilizable pero existen email y password admin
- **THEN** el sistema obtiene token mediante `/api/collections/_superusers/auth-with-password`
- **AND** si falla intenta `/api/admins/auth-with-password`

#### Scenario: Token administrativo rechazado
- **WHEN** PocketBase responde `401` o `403` a una llamada administrativa y existen email y password admin configurados
- **THEN** el sistema descarta el token rechazado
- **AND** obtiene un nuevo token administrativo
- **AND** reintenta una sola vez la operación original

#### Scenario: Renovación sin credenciales
- **WHEN** el token administrativo no es reutilizable o PocketBase lo rechaza y no existen credenciales para renovarlo
- **THEN** el sistema informa el fallo sin repetir indefinidamente la solicitud

#### Scenario: Autorización del usuario solicitante
- **WHEN** un usuario sin rol activo `admin` intenta invocar una ruta administrativa
- **THEN** el endpoint responde `403`
- **AND** no usa la renovación del token server-side para eludir esa restricción
