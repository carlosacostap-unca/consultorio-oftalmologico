## ADDED Requirements

### Requirement: Recetas reasignadas por fusion de pacientes
El sistema SHALL conservar las recetas al fusionar pacientes duplicados.

#### Scenario: Fusion reasigna recetas
- **WHEN** un paciente duplicado se fusiona con un paciente principal
- **THEN** el sistema actualiza las recetas del duplicado para apuntar al paciente principal
- **AND** las recetas siguen accesibles desde el paciente principal

#### Scenario: Receta vinculada a consulta reasignada
- **WHEN** una receta esta vinculada a una consulta tambien reasignada
- **THEN** el sistema conserva la relacion con la consulta
- **AND** actualiza el paciente de la receta al paciente principal
