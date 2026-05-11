## MODIFIED Requirements

### Requirement: Disponibilidades de agenda
El sistema SHALL administrar bloques horarios disponibles y mostrar sus horarios libres/ocupados en la agenda diaria.

#### Scenario: Mostrar slots de disponibilidad diaria
- **WHEN** el usuario abre la agenda diaria
- **AND** existe una disponibilidad para un medico en la fecha seleccionada
- **THEN** el sistema muestra horarios discretos dentro del rango de la disponibilidad
- **AND** marca como ocupado cualquier horario que se solape con un turno existente del mismo medico
- **AND** marca como libre los horarios sin solapamiento

#### Scenario: Crear turno desde slot libre
- **WHEN** el usuario selecciona un slot libre de una disponibilidad diaria
- **THEN** el sistema abre el modal de alta rapida
- **AND** precarga el horario exacto del slot seleccionado

#### Scenario: Mostrar slot ocupado
- **WHEN** un slot esta ocupado por un turno existente
- **THEN** el sistema muestra el horario como ocupado
- **AND** no crea un turno regular desde ese chip
