## ADDED Requirements

### Requirement: Trazabilidad en operaciones de secretaria
El sistema SHALL dejar trazabilidad visible de las acciones realizadas por secretaria sobre turnos del dia.

#### Scenario: Secretaria marca llegada
- **WHEN** secretaria marca que un paciente llego desde Sala de espera o Agenda Diaria
- **THEN** el sistema actualiza el turno a `En espera`
- **AND** crea un evento visible en el historial del turno

#### Scenario: Secretaria pasa paciente a consulta
- **WHEN** secretaria pasa un paciente a `En consulta`
- **THEN** el sistema actualiza el estado del turno
- **AND** crea un evento visible en el historial del turno

#### Scenario: Secretaria marca ausencia
- **WHEN** secretaria intenta marcar un turno como `Ausente`
- **THEN** el sistema solicita motivo de ausencia antes de guardar
- **AND** crea un evento con ese motivo si confirma la accion

### Requirement: Historial accesible durante gestion diaria
El sistema SHALL permitir que secretaria consulte el historial del turno sin abandonar Gestion de Turnos.

#### Scenario: Ver historial desde Gestionar
- **WHEN** secretaria abre `Gestionar` en un turno de Agenda Diaria o Sala de espera
- **THEN** el modal muestra una seccion de historial operativo
- **AND** la seccion lista los eventos del turno ordenados por fecha

#### Scenario: Continuar operando con historial visible
- **WHEN** secretaria esta viendo el historial de un turno
- **THEN** puede volver a datos, cancelacion o reprogramacion sin cerrar el modal
