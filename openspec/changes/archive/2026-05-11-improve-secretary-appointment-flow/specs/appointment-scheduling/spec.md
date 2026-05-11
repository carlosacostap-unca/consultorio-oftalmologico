## MODIFIED Requirements

### Requirement: Creacion de turno
El sistema SHALL permitir agendar turnos vinculados a medico, paciente y disponibilidad mediante un flujo que prioriza medico, fecha, disponibilidad y horario antes de confirmar el paciente.

#### Scenario: Crear turno regular
- **WHEN** el usuario selecciona medico, fecha, disponibilidad, horario libre, duracion y paciente
- **THEN** el sistema valida que la hora este dentro del rango de disponibilidad
- **AND** valida que el horario no este ocupado por otro turno del mismo medico salvo que sea sobreturno
- **AND** crea el turno con `medico_id`, fecha/hora ISO, tipo, duracion, estado, motivo, observaciones y `disponibilidad_id`

#### Scenario: Crear paciente durante turno
- **WHEN** el paciente no existe durante la carga de turno
- **THEN** el sistema permite crear un paciente minimo
- **AND** selecciona automaticamente el nuevo paciente para el turno

#### Scenario: Editar datos del paciente durante turno
- **WHEN** el usuario modifica datos del paciente seleccionado desde el formulario de turno
- **THEN** el sistema actualiza el registro de `pacientes`
- **AND** mantiene seleccionado al paciente actualizado

#### Scenario: Bloquear turno sin medico
- **WHEN** el usuario intenta guardar un turno sin `medico_id`
- **THEN** el sistema bloquea la operacion
- **AND** muestra que debe seleccionarse un medico

### Requirement: Sobreturnos
El sistema SHALL permitir crear turnos marcados como sobreturno fuera de la validacion estricta de disponibilidad, manteniendo medico y contexto de agenda.

#### Scenario: Crear sobreturno
- **WHEN** el usuario marca un turno como sobreturno
- **THEN** el sistema permite indicar tipo de sobreturno
- **AND** guarda `es_sobreturno`, `sobreturno_tipo` y `medico_id`

#### Scenario: Contexto de turnos adyacentes
- **WHEN** el usuario crea un sobreturno con fecha, hora y medico
- **THEN** el sistema muestra el turno anterior y posterior del mismo medico y dia cuando existen
