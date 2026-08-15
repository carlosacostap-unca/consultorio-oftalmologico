## MODIFIED Requirements

### Requirement: Guardas anti-produccion del destino
El bootstrap SHALL rechazar cambios si la URL destino no parece una instancia de testing o staging, salvo override explicito, y SHALL rechazar siempre los hosts productivos conocidos cuando no se haya habilitado ese override deliberado.

#### Scenario: URL destino no segura
- **WHEN** se ejecuta el bootstrap con guardas activas y una URL destino que no contiene un marcador no productivo reconocido
- **THEN** el script aborta antes de crear o actualizar colecciones

#### Scenario: URL destino test
- **WHEN** se ejecuta el bootstrap con una URL destino que contiene `test`, `testing`, `localhost` o `127.0.0.1`
- **THEN** el script permite continuar con la inicializacion del esquema

#### Scenario: URL destino staging
- **WHEN** se ejecuta el bootstrap con una URL destino que contiene `staging` y no coincide con un host productivo conocido
- **THEN** el script permite continuar con la inicializacion del esquema

#### Scenario: Host productivo conocido
- **WHEN** la URL destino coincide con un host productivo conocido
- **THEN** el script aborta aunque otro fragmento de la URL contenga un marcador no productivo
