## ADDED Requirements

### Requirement: Agenda diaria para medico
El sistema SHALL adaptar la agenda diaria de turnos al rol activo `medico`, mostrando solamente la agenda propia y acciones orientadas a atencion.

#### Scenario: Medico ve solo su agenda
- **WHEN** un usuario con rol activo `medico` abre la vista diaria de turnos
- **THEN** el sistema filtra turnos y disponibilidades por el usuario medico autenticado
- **AND** muestra el nombre del medico como contexto de agenda

#### Scenario: Medico no gestiona otros medicos
- **WHEN** un usuario con rol activo `medico` usa el selector o contexto de medico
- **THEN** el sistema no permite seleccionar `Todos los medicos` ni otros medicos
- **AND** conserva la seleccion del medico autenticado

#### Scenario: Acciones principales de atencion
- **WHEN** la vista diaria muestra un turno del medico
- **THEN** el sistema prioriza acciones para ficha del paciente, iniciar consulta, continuar consulta y cambio de estado clinico
- **AND** mantiene disponibles los datos operativos del turno sin mezclar agendas de otros medicos
