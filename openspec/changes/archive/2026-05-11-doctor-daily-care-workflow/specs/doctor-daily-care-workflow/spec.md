## ADDED Requirements

### Requirement: Jornada diaria del medico
El sistema SHALL ofrecer al medico una vista diaria enfocada en sus propios turnos y pacientes de atencion.

#### Scenario: Cargar jornada propia
- **WHEN** un usuario con rol activo `medico` abre el modulo de turnos
- **THEN** el sistema muestra por defecto los turnos del dia asociados a su usuario medico
- **AND** no permite cambiar a la agenda de otro medico

#### Scenario: Resumen clinico del dia
- **WHEN** la jornada diaria del medico carga turnos
- **THEN** el sistema muestra conteos de proximos, en espera, en consulta, atendidos, ausentes y cancelados
- **AND** destaca los pacientes que requieren accion clinica

### Requirement: Acciones clinicas desde turno
El sistema SHALL permitir que el medico inicie o continue la atencion clinica desde un turno del dia.

#### Scenario: Iniciar consulta desde turno
- **WHEN** el medico inicia la atencion de un turno sin consulta vinculada
- **THEN** el sistema navega a `/consultas/nueva` con `paciente_id` y `turno_id`
- **AND** marca el turno como `En consulta` cuando el estado actual permite atencion

#### Scenario: Continuar consulta vinculada
- **WHEN** el medico selecciona un turno que ya tiene `consulta_id`
- **THEN** el sistema ofrece continuar o ver la consulta existente
- **AND** navega a `/consultas/<consulta_id>` sin crear una consulta duplicada

#### Scenario: Acceso rapido al paciente
- **WHEN** el medico revisa un turno de su jornada
- **THEN** el sistema permite abrir la ficha del paciente
- **AND** muestra datos utiles para la atencion como documento, telefono, obra social o historial reciente cuando esten disponibles
