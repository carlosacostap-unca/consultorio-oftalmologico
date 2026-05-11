## MODIFIED Requirements

### Requirement: Disponibilidades de agenda
El sistema SHALL administrar bloques horarios disponibles para turnos desde la pantalla `/turnos`.

#### Scenario: Listar disponibilidades
- **WHEN** el usuario abre `/turnos` y selecciona la vista Disponibilidades
- **THEN** el sistema lista `disponibilidades` ordenadas por `fecha_hora_inicio` descendente
- **AND** muestra fecha, hora de inicio, hora de fin, tipo y cantidad de turnos otorgados

#### Scenario: Conteo de turnos otorgados
- **WHEN** una disponibilidad tiene turnos vinculados por `disponibilidad_id`
- **THEN** la fila de esa disponibilidad muestra la cantidad total de esos turnos
- **AND** disponibilidades sin turnos vinculados muestran 0
