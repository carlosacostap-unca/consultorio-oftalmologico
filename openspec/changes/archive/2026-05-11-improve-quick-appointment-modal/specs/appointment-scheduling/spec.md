## ADDED Requirements

### Requirement: Alta rapida consistente con disponibilidad
El sistema SHALL crear turnos desde el modal de alta rapida respetando la disponibilidad, medico y horario seleccionados en Agenda Diaria.

#### Scenario: Crear turno regular desde slot libre diario
- **WHEN** la secretaria guarda un turno regular desde un slot libre de Agenda Diaria
- **THEN** el sistema crea el turno con `medico_id`, `disponibilidad_id`, `fecha_hora`, `tipo`, `duracion`, paciente y motivo
- **AND** el turno queda marcado como no sobreturno

#### Scenario: Bloquear turno regular superpuesto
- **WHEN** la secretaria intenta guardar un turno regular que se superpone con otro turno del mismo medico
- **THEN** el sistema bloquea el guardado
- **AND** informa que el horario se superpone con otro turno

### Requirement: Sobreturno rapido desde slot ocupado
El sistema SHALL permitir crear un sobreturno desde un slot ocupado de Agenda Diaria solo cuando el usuario lo inicia explicitamente desde ese slot.

#### Scenario: Crear sobreturno desde slot ocupado diario
- **WHEN** la secretaria guarda un sobreturno desde un slot ocupado de Agenda Diaria
- **THEN** el sistema crea el turno con `es_sobreturno: true`
- **AND** guarda `sobreturno_tipo`, medico, disponibilidad, fecha/hora, paciente y motivo
- **AND** conserva visible el contexto del turno ocupado durante la carga

#### Scenario: Refrescar ocupacion tras alta rapida
- **WHEN** se crea un turno regular o sobreturno desde el modal de alta rapida
- **THEN** la agenda diaria actualiza el listado de turnos
- **AND** los slots de disponibilidad reflejan la nueva ocupacion sin recargar la pagina manualmente
