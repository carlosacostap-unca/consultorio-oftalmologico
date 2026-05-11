## MODIFIED Requirements

### Requirement: Sobreturnos
El sistema SHALL permitir crear turnos marcados como sobreturno desde el formulario completo o desde un slot ocupado de la agenda diaria.

#### Scenario: Crear sobreturno desde slot ocupado
- **WHEN** el usuario selecciona un slot ocupado en la agenda diaria
- **THEN** el sistema abre el modal de alta rapida en modo sobreturno
- **AND** muestra contexto del turno existente cuando esta disponible
- **AND** precarga medico, fecha/hora, disponibilidad y tipo
- **WHEN** el usuario guarda con paciente, motivo y tipo de sobreturno
- **THEN** el sistema crea un turno con `es_sobreturno: true`
- **AND** guarda `sobreturno_tipo`
- **AND** refresca la agenda visible sin abandonar `/turnos`

#### Scenario: Distinguir sobreturno en agenda diaria
- **WHEN** la agenda diaria muestra un turno marcado como sobreturno
- **THEN** el sistema lo identifica visualmente como sobreturno
