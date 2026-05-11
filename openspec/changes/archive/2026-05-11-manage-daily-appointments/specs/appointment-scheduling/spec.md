## MODIFIED Requirements

### Requirement: Estados y acciones rapidas de turno
El sistema SHALL permitir editar motivo, observaciones, estado y cancelacion historica de un turno desde el listado.

#### Scenario: Cancelar turno conservando historial
- **WHEN** el usuario abre el modal de gestion de un turno
- **AND** ingresa un motivo de cancelacion
- **AND** confirma cancelar el turno
- **THEN** el sistema actualiza el turno con estado `Cancelado`
- **AND** conserva el registro en la agenda
- **AND** agrega el motivo de cancelacion a observaciones

#### Scenario: Mostrar turno cancelado
- **WHEN** la agenda muestra un turno con estado `Cancelado`
- **THEN** el sistema lo identifica visualmente como cancelado
- **AND** no lo elimina del historial visible
