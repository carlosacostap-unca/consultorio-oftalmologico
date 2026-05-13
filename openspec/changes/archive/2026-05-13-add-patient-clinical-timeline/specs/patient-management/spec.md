## MODIFIED Requirements

### Requirement: Historial clinico desde paciente
El sistema SHALL mostrar las consultas del paciente ordenadas por fecha descendente, una continuidad clinica resumida, una historia clinica unificada y sus recetas recientes asociadas.

#### Scenario: Paciente con consultas
- **WHEN** el paciente tiene consultas registradas
- **THEN** el sistema muestra su continuidad clinica reciente con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** muestra su historial con fecha, motivo y diagnostico
- **AND** cada consulta permite abrir la consulta en modo vista

#### Scenario: Paciente con recetas
- **WHEN** el paciente tiene recetas registradas
- **THEN** el sistema muestra las recetas mas recientes con fecha, indicacion resumida y vinculacion con consulta cuando exista
- **AND** cada receta permite abrir su detalle en modo vista
- **AND** cada receta permite abrir su version imprimible

#### Scenario: Historia clinica unificada
- **WHEN** el paciente tiene consultas o recetas registradas
- **THEN** el sistema muestra una historia clinica unificada con eventos recientes ordenados por fecha descendente
- **AND** cada evento muestra si corresponde a consulta o receta
- **AND** cada evento permite abrir su registro asociado

#### Scenario: Nueva consulta desde ficha
- **WHEN** el usuario elige crear consulta desde el detalle del paciente
- **THEN** el sistema navega a `/consultas/nueva?paciente_id=<id>`

#### Scenario: Nueva receta desde ficha
- **WHEN** el usuario elige crear receta desde el detalle del paciente
- **THEN** el sistema navega a `/recetas/nueva?paciente_id=<id>`
