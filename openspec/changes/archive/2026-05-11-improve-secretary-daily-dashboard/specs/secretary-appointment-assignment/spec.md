## ADDED Requirements

### Requirement: Seguimiento operativo desde agenda diaria
El sistema SHALL permitir que la secretaria use Agenda Diaria como punto principal para seguimiento y acciones inmediatas sobre turnos del dia.

#### Scenario: Acciones visibles sobre turno del dia
- **WHEN** la agenda diaria muestra un turno otorgado
- **THEN** el sistema ofrece acciones rapidas para gestionar estado, abrir detalles, cancelar o reprogramar segun corresponda
- **AND** las acciones preservan la fecha y el medico actual al volver a la agenda

#### Scenario: Alta rapida desde disponibilidad diaria
- **WHEN** la agenda diaria muestra un slot libre dentro de una disponibilidad
- **THEN** la secretaria puede iniciar alta rapida de turno desde ese slot
- **AND** el sistema precarga medico, fecha, hora, disponibilidad y tipo
