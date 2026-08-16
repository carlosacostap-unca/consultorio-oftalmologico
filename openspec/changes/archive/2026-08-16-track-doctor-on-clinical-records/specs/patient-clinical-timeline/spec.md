## ADDED Requirements

### Requirement: Medico en historia clinica del paciente
El sistema SHALL mostrar el medico asociado a cada evento clinico de consulta o receta en la ficha del paciente.

#### Scenario: Evento de consulta con medico
- **WHEN** la historia clinica del paciente muestra una consulta con `medico_id`
- **THEN** el evento muestra el nombre del medico responsable

#### Scenario: Evento de receta con medico
- **WHEN** la historia clinica del paciente muestra una receta con `medico_id`
- **THEN** el evento muestra el nombre del medico emisor

#### Scenario: Evento historico sin medico
- **WHEN** un evento clinico no tiene medico registrado
- **THEN** la historia clinica muestra "Medico no registrado"
- **AND** mantiene disponibles las acciones del evento
