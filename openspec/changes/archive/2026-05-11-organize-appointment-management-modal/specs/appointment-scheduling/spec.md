## MODIFIED Requirements

### Requirement: Estados y acciones rapidas de turno
El sistema SHALL permitir editar motivo, observaciones y estado de un turno desde el listado, y SHALL separar la edicion, reprogramacion y cancelacion en areas operativas distintas dentro del modal de turno.

#### Scenario: Cambiar estado
- **WHEN** el usuario selecciona un estado para un turno
- **THEN** el sistema actualiza `estado` en `turnos`
- **AND** refleja el cambio localmente

#### Scenario: Modal de turno
- **WHEN** el usuario abre el modal de un turno
- **THEN** el sistema muestra datos del paciente, hora, tipo, estado, motivo y observaciones
- **AND** permite guardar cambios o eliminar el turno

#### Scenario: Acciones separadas del modal
- **WHEN** el usuario abre el modal de un turno
- **THEN** el sistema muestra secciones separadas para datos, reprogramacion y cancelacion
- **AND** las acciones de cancelar o eliminar no quedan mezcladas con la edicion de motivo, observaciones y estado

#### Scenario: Reprogramar desde seccion dedicada
- **WHEN** el usuario entra a la seccion de reprogramacion del modal
- **THEN** el sistema permite elegir medico, fecha, disponibilidad y slot libre
- **AND** mantiene las validaciones actuales antes de guardar la reprogramacion

#### Scenario: Cancelar desde seccion dedicada
- **WHEN** el usuario entra a la seccion de cancelacion del modal
- **THEN** el sistema solicita un motivo de cancelacion
- **AND** permite cancelar el turno solo si el motivo fue completado
