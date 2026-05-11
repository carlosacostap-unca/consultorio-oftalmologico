## ADDED Requirements

### Requirement: Consulta iniciada desde jornada medica
El sistema SHALL conservar el contexto del turno cuando una consulta clinica se inicia desde la jornada diaria del medico.

#### Scenario: Precargar consulta desde turno
- **WHEN** el medico abre `/consultas/nueva` con `turno_id`
- **THEN** el sistema carga el turno con paciente asociado
- **AND** precarga paciente, numero de ficha, motivo y antecedentes disponibles

#### Scenario: Finalizar atencion del turno
- **WHEN** el medico guarda una consulta creada desde un turno
- **THEN** el sistema vincula la consulta al turno
- **AND** cambia el turno a `Atendido`

#### Scenario: Evitar consulta duplicada
- **WHEN** un turno ya tiene una consulta asociada
- **THEN** el sistema dirige al medico a la consulta existente
- **AND** no ofrece crear otra consulta para el mismo turno como accion principal
