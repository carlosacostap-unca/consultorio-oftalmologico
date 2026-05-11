## ADDED Requirements

### Requirement: Historial integrado a acciones de turno
El sistema SHALL crear eventos de historial cuando las acciones principales modifican un turno.

#### Scenario: Guardar cambios operativos
- **WHEN** el usuario edita motivo, observaciones o estado desde la gestion de turno
- **THEN** el sistema actualiza el turno
- **AND** crea un evento que describe los campos modificados

#### Scenario: Cambiar estado desde lista o sala de espera
- **WHEN** el usuario cambia el estado desde una accion rapida o selector de estado
- **THEN** el sistema persiste el nuevo estado
- **AND** crea un evento de cambio de estado asociado al turno

#### Scenario: Reprogramar turno con historial estructurado
- **WHEN** el usuario confirma una reprogramacion
- **THEN** el sistema actualiza fecha/hora, medico, disponibilidad, tipo y duracion cuando correspondan
- **AND** crea un evento de reprogramacion con horario anterior y horario nuevo

### Requirement: Motivo obligatorio para estados sensibles
El sistema SHALL solicitar motivo antes de aplicar estados operativos sensibles.

#### Scenario: Cancelar con motivo
- **WHEN** el usuario cancela un turno
- **THEN** el sistema exige un motivo de cancelacion
- **AND** guarda ese motivo en el evento de historial

#### Scenario: Marcar ausente con motivo
- **WHEN** el usuario marca un turno como `Ausente`
- **THEN** el sistema exige un motivo de ausencia
- **AND** guarda ese motivo en el evento de historial
