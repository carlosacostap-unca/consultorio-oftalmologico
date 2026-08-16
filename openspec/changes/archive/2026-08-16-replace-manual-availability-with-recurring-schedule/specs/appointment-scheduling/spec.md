## ADDED Requirements

### Requirement: Agenda diaria basada en reglas recurrentes
El sistema SHALL mostrar agenda diaria usando horarios generados desde reglas semanales recurrentes y bloqueos.

#### Scenario: Mostrar slots recurrentes
- **WHEN** secretaria abre Agenda Diaria para una fecha y medico
- **THEN** el sistema muestra slots generados desde reglas activas del medico para ese dia de semana
- **AND** identifica el tipo de atencion de cada slot

#### Scenario: Mostrar slots bloqueados
- **WHEN** un slot generado cae dentro de un bloqueo
- **THEN** el sistema lo muestra como bloqueado o no seleccionable
- **AND** muestra el motivo del bloqueo cuando este disponible

#### Scenario: Convivir con disponibilidades puntuales
- **WHEN** existen disponibilidades puntuales para la misma fecha
- **THEN** el sistema mantiene compatibilidad con esos bloques durante la etapa de transicion
- **AND** evita duplicar visualmente slots equivalentes cuando sea posible

### Requirement: Turnos a resolver
El sistema SHALL mostrar una bandeja especial con turnos que quedaron en conflicto por bloqueos.

#### Scenario: Bandeja con conflictos
- **WHEN** existen turnos otorgados dentro de bloqueos vigentes
- **THEN** el sistema los muestra en una bandeja `Turnos a resolver`
- **AND** cada turno muestra paciente, medico, fecha, hora, tipo y motivo del bloqueo

#### Scenario: Resolver conflicto desde la bandeja
- **WHEN** un usuario abre un turno en conflicto
- **THEN** el sistema permite gestionar, cancelar o reprogramar el turno usando los flujos existentes
- **AND** conserva visible que el turno estaba en conflicto hasta que deje de estar afectado por el bloqueo
