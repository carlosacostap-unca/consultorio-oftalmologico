## ADDED Requirements

### Requirement: Mutuales administrativas para legacy incompleto
El sistema SHALL permitir representar codigos legacy de cobertura no identificada sin inventar coincidencias con obras sociales reales.

#### Scenario: Codigo legacy sin mutual
- **WHEN** un paciente legacy usa un codigo de mutual ausente en `MUTUALES.DBF`
- **THEN** el sistema no lo asocia por aproximacion a una mutual real
- **AND** lo reporta o lo asocia a una mutual administrativa segun configuracion

#### Scenario: Crear mutual administrativa
- **WHEN** el reemplazo DBF requiere conservar pacientes con cobertura no identificada
- **THEN** el sistema crea o reutiliza una mutual administrativa con nombre y codigo definidos para migracion
- **AND** permite distinguirla de mutuales reales en reportes y listados

### Requirement: Mapeo de mutuales por codigo legacy
El sistema SHALL usar `COD_MUT` como clave principal de mapeo entre mutuales y pacientes legacy.

#### Scenario: Codigo de mutual coincidente
- **WHEN** `PACIENTE.DBF.COD_MUTU` coincide con `MUTUALES.DBF.COD_MUT`
- **THEN** el paciente importado queda relacionado con la mutual correspondiente
- **AND** conserva el nombre textual de obra social para compatibilidad con vistas existentes

#### Scenario: Codigo duplicado o vacio en mutuales
- **WHEN** `MUTUALES.DBF` contiene codigo vacio o duplicado
- **THEN** el diagnostico lo reporta como excepcion
- **AND** el importador no usa ese codigo para asignaciones automaticas ambiguas
