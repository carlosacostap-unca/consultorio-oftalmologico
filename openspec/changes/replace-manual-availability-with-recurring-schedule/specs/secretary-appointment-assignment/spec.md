## ADDED Requirements

### Requirement: Otorgamiento desde agenda recurrente
El sistema SHALL permitir que secretaria otorgue turnos usando slots generados por la agenda semanal del medico.

#### Scenario: Seleccionar horario generado
- **WHEN** secretaria elige medico, fecha y tipo de atencion
- **THEN** el sistema muestra horarios generados desde las reglas recurrentes activas
- **AND** permite seleccionar solo horarios libres y no bloqueados para turno regular

#### Scenario: Duracion segun tipo y regla
- **WHEN** secretaria selecciona un slot generado
- **THEN** el turno usa la duracion configurada en la regla semanal que genero el slot
- **AND** conserva 15 minutos por defecto para consultas si la regla no define otra duracion

#### Scenario: Advertir conflictos al bloquear
- **WHEN** secretaria crea un bloqueo que afecta turnos otorgados
- **THEN** el sistema informa la cantidad de turnos afectados
- **AND** permite continuar para que esos turnos pasen a la bandeja de resolucion
