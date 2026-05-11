# pocketbase-test-schema-bootstrap Specification

## Purpose
TBD - created by archiving change bootstrap-pocketbase-test-schema. Update Purpose after archive.
## Requirements
### Requirement: Bootstrap de esquema de testing
El sistema SHALL proveer un script administrativo para inicializar el esquema de una instancia PocketBase de testing a partir de una instancia fuente configurada.

#### Scenario: Crear colecciones faltantes
- **WHEN** se ejecuta el bootstrap con una instancia fuente valida y una instancia destino de testing
- **THEN** el script crea en destino las colecciones no-sistema faltantes necesarias para la aplicacion
- **AND** no copia registros clinicos ni usuarios reales

#### Scenario: Actualizar colecciones existentes
- **WHEN** una coleccion no-sistema ya existe en destino
- **THEN** el script actualiza su definicion de campos, reglas e indices cuando corresponda

### Requirement: Guardas anti-produccion del destino
El bootstrap SHALL rechazar cambios si la URL destino no parece una instancia de testing, salvo override explicito.

#### Scenario: URL destino no segura
- **WHEN** se ejecuta el bootstrap con guardas activas y una URL destino que no contiene marcador de testing
- **THEN** el script aborta antes de crear o actualizar colecciones

#### Scenario: URL destino test
- **WHEN** se ejecuta el bootstrap con una URL destino que contiene `test`, `testing`, `localhost` o `127.0.0.1`
- **THEN** el script permite continuar con la inicializacion del esquema

### Requirement: Separacion fuente-destino
El bootstrap SHALL leer credenciales de fuente y destino desde archivos de entorno separados.

#### Scenario: Fuente y destino configurados
- **WHEN** se proveen `--source-env` y `--target-env`
- **THEN** el script autentica ambas instancias de forma independiente
- **AND** solo realiza escrituras contra la instancia destino
