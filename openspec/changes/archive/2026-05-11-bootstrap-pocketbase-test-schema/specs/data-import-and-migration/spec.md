## MODIFIED Requirements

### Requirement: Autenticacion de scripts administrativos
Los scripts administrativos SHALL autenticarse contra PocketBase con token o credenciales de administrador.

#### Scenario: Token disponible
- **WHEN** existe token administrativo en el entorno
- **THEN** el script lo usa en las llamadas a PocketBase

#### Scenario: Credenciales disponibles
- **WHEN** no hay token pero hay credenciales
- **THEN** el script obtiene token mediante endpoint admin o `_superusers`

#### Scenario: Entorno fuente y destino
- **WHEN** un script administrativo necesita leer una instancia fuente y escribir en una instancia destino
- **THEN** el script autentica cada instancia con su propio archivo de entorno
- **AND** aplica guardas anti-produccion antes de escribir en el destino
