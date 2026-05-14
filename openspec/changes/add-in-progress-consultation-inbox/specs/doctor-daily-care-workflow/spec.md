## ADDED Requirements

### Requirement: Bandeja diaria de consultas pendientes
El sistema SHALL mostrar al medico una bandeja de consultas pendientes de cierre dentro de su jornada diaria.

#### Scenario: Mostrar bandeja en jornada medica
- **WHEN** un usuario con rol activo `medico` abre el modulo de turnos
- **THEN** el sistema muestra una seccion de consultas en curso
- **AND** la seccion no reemplaza el tablero diario ni la agenda

#### Scenario: Bandeja sin consultas en curso
- **WHEN** no existen consultas con `estado = en_curso`
- **THEN** el sistema muestra un estado vacio claro
- **AND** mantiene disponibles las acciones habituales de la jornada
