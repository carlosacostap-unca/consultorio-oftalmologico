## MODIFIED Requirements

### Requirement: Jornada diaria del medico
El sistema SHALL ofrecer al medico una vista diaria enfocada en sus propios turnos y pacientes de atencion.

#### Scenario: Cargar jornada propia
- **WHEN** un usuario con rol activo `medico` abre el modulo de turnos
- **THEN** el sistema muestra por defecto los turnos del dia asociados a su usuario medico
- **AND** no permite cambiar a la agenda de otro medico

#### Scenario: Resumen clinico del dia
- **WHEN** la jornada diaria del medico carga turnos
- **THEN** el sistema muestra conteos de proximos, en espera, en consulta, atendidos, ausentes y cancelados
- **AND** destaca el paciente en consulta cuando exista
- **AND** destaca el proximo paciente que requiere accion clinica
- **AND** muestra los pacientes pendientes de atencion del dia

#### Scenario: Acciones desde tablero diario
- **WHEN** el medico revisa el tablero diario
- **THEN** el sistema permite iniciar o continuar la consulta del paciente destacado
- **AND** permite abrir la ficha clinica del paciente
- **AND** permite crear una receta vinculada al paciente
