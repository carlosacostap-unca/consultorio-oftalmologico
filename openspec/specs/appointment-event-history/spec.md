# appointment-event-history Specification

## Purpose
TBD - created by archiving change add-appointment-event-history. Update Purpose after archive.
## Requirements
### Requirement: Registro de eventos de turno
El sistema SHALL registrar eventos operativos vinculados a turnos sin reemplazar el estado actual guardado en `turnos`.

#### Scenario: Registrar creacion de turno
- **WHEN** se crea un turno desde un formulario completo, alta rapida o sobreturno
- **THEN** el sistema crea un evento asociado al turno con tipo `created`
- **AND** el evento identifica actor, paciente, medico, fecha/hora y motivo del turno cuando esos datos esten disponibles

#### Scenario: Registrar cambio de estado
- **WHEN** el usuario cambia el estado de un turno
- **THEN** el sistema crea un evento con tipo `status_changed`
- **AND** guarda estado anterior y estado nuevo

#### Scenario: Registrar cancelacion
- **WHEN** el usuario cancela un turno
- **THEN** el sistema crea un evento con tipo `canceled`
- **AND** guarda el motivo de cancelacion en el detalle del evento

#### Scenario: Registrar reprogramacion
- **WHEN** el usuario reprograma un turno
- **THEN** el sistema crea un evento con tipo `rescheduled`
- **AND** guarda fecha/hora anterior, fecha/hora nueva y medico cuando cambie

### Requirement: Visualizacion de historial del turno
El sistema SHALL permitir ver el historial de eventos de un turno desde la gestion del turno.

#### Scenario: Abrir historial desde el modal
- **WHEN** el usuario abre el modal de gestion de un turno
- **THEN** el sistema carga los eventos asociados al turno
- **AND** muestra fecha, accion, actor y detalle de cada evento

#### Scenario: Historial vacio
- **WHEN** un turno no tiene eventos registrados
- **THEN** el sistema muestra un mensaje claro indicando que todavia no hay historial operativo para ese turno

#### Scenario: Error al cargar historial
- **WHEN** PocketBase no permite cargar eventos o la coleccion no esta disponible
- **THEN** el sistema informa que no pudo cargar el historial
- **AND** mantiene disponibles las acciones principales del turno

### Requirement: Trazabilidad de actor
El sistema SHALL identificar quien realizo cada evento operativo cuando el usuario autenticado este disponible.

#### Scenario: Evento con usuario autenticado
- **WHEN** un usuario autenticado realiza una accion trazable
- **THEN** el evento guarda `actor_id`
- **AND** guarda una etiqueta legible del actor basada en nombre o email

#### Scenario: Actor no disponible
- **WHEN** el actor no puede determinarse
- **THEN** el sistema guarda el evento sin bloquear la operacion principal
- **AND** muestra el actor como `Sistema` o `Usuario no identificado`

