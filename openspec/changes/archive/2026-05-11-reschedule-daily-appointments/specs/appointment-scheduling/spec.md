## MODIFIED Requirements

### Requirement: Edicion y vista de turno
El sistema SHALL permitir ver, editar o reprogramar un turno existente desde `/turnos/[id]` o desde la agenda diaria.

#### Scenario: Reprogramar turno desde agenda diaria
- **WHEN** el usuario abre el modal de gestion de un turno desde la agenda diaria
- **AND** selecciona fecha, medico y un slot libre de disponibilidad
- **AND** confirma reprogramar
- **THEN** el sistema actualiza el mismo turno con nueva fecha/hora, medico, disponibilidad, tipo y duracion
- **AND** conserva el registro historico del turno
- **AND** agrega una nota en observaciones indicando la reprogramacion

#### Scenario: Bloquear reprogramacion hacia slot ocupado
- **WHEN** un slot esta ocupado por otro turno del mismo medico
- **THEN** el sistema no permite seleccionarlo como destino de reprogramacion
