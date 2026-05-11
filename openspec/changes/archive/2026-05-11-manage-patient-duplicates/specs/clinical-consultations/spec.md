## ADDED Requirements

### Requirement: Consultas reasignadas por fusion de pacientes
El sistema SHALL conservar las consultas clinicas al fusionar pacientes duplicados.

#### Scenario: Fusion reasigna consultas
- **WHEN** un paciente duplicado se fusiona con un paciente principal
- **THEN** el sistema actualiza las consultas del duplicado para apuntar al paciente principal
- **AND** el historial clinico del paciente principal incluye esas consultas

#### Scenario: Consultas dejan de apuntar al duplicado
- **WHEN** la fusion finaliza correctamente
- **THEN** no quedan consultas activas asociadas al paciente duplicado
- **AND** el paciente duplicado conserva trazabilidad hacia el paciente principal
