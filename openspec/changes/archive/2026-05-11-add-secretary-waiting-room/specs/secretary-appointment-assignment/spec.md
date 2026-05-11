## ADDED Requirements

### Requirement: Sala de espera operativa
El sistema SHALL ofrecer a secretaria una vista de sala de espera para seguir pacientes del dia por estado operativo.

#### Scenario: Abrir sala de espera
- **WHEN** una secretaria abre Gestion de Turnos
- **THEN** el sistema ofrece una opcion de vista llamada Sala de espera
- **AND** la vista usa la fecha seleccionada o la fecha actual si no hay fecha seleccionada

#### Scenario: Agrupar pacientes por estado
- **WHEN** la secretaria abre Sala de espera
- **THEN** el sistema agrupa los turnos del dia en proximos, en espera, en consulta, atendidos, ausentes y cancelados
- **AND** cada grupo muestra su cantidad de turnos

#### Scenario: Ver contexto del paciente
- **WHEN** un turno aparece en Sala de espera
- **THEN** el sistema muestra hora, paciente, medico, tipo, estado y motivo
- **AND** si se esta viendo `Todos los medicos`, identifica el medico del turno

### Requirement: Acciones de recepcion
El sistema SHALL permitir que secretaria actualice estados del dia desde Sala de espera sin abandonar Gestion de Turnos.

#### Scenario: Marcar llegada
- **WHEN** secretaria marca un turno como llego desde Sala de espera
- **THEN** el sistema actualiza el estado del turno a `En espera`
- **AND** mueve el turno al grupo En espera

#### Scenario: Pasar a consulta
- **WHEN** secretaria pasa un turno a consulta desde Sala de espera
- **THEN** el sistema actualiza el estado del turno a `En consulta`
- **AND** mueve el turno al grupo En consulta

#### Scenario: Marcar cierre operativo
- **WHEN** secretaria marca un turno como atendido o ausente desde Sala de espera
- **THEN** el sistema actualiza el estado correspondiente
- **AND** mantiene disponible la accion de gestionar turno
