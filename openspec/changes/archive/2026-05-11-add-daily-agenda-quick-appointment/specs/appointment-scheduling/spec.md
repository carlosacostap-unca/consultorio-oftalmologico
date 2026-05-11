## MODIFIED Requirements

### Requirement: Creacion de turno
El sistema SHALL permitir agendar turnos vinculados a paciente y disponibilidad desde formulario completo o alta rapida en agenda diaria.

#### Scenario: Crear turno rapido desde agenda diaria
- **WHEN** el usuario selecciona alta rapida desde una disponibilidad en la agenda diaria
- **THEN** el sistema abre un modal sin abandonar `/turnos`
- **AND** precarga medico, fecha/hora, disponibilidad y tipo
- **AND** permite seleccionar paciente, motivo, observaciones y duracion
- **WHEN** el usuario guarda el turno rapido con datos validos
- **THEN** el sistema crea el turno
- **AND** refresca la agenda diaria visible sin navegar a otra pantalla

#### Scenario: Bloquear turno rapido incompleto
- **WHEN** el usuario intenta guardar un turno rapido sin paciente o motivo
- **THEN** el sistema informa el dato faltante
- **AND** no crea el turno

#### Scenario: Evitar solapamiento en turno rapido
- **WHEN** el horario rapido se superpone con otro turno del mismo medico
- **THEN** el sistema bloquea el alta regular
- **AND** sugiere usar el formulario completo si necesita un caso excepcional
