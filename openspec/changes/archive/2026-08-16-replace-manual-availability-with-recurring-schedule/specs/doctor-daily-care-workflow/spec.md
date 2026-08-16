## ADDED Requirements

### Requirement: Bloqueo propio del medico
El sistema SHALL permitir que el medico bloquee su propia agenda sin gestionar agendas de otros medicos.

#### Scenario: Medico crea bloqueo propio
- **WHEN** un usuario con rol activo `medico` crea un bloqueo desde su agenda
- **THEN** el sistema asigna el bloqueo a su propio usuario medico
- **AND** no permite cambiar el medico del bloqueo

#### Scenario: Medico ve turnos propios en conflicto
- **WHEN** un bloqueo propio o general afecta turnos del medico
- **THEN** la jornada del medico muestra esos turnos como conflictos a resolver
- **AND** permite abrir el turno para gestionar la situacion
