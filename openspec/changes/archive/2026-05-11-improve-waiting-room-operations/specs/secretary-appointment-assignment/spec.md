## ADDED Requirements

### Requirement: Sala de espera como tablero operativo
El sistema SHALL permitir que secretaria gestione la recepcion diaria desde Sala de espera con contexto suficiente para cada turno.

#### Scenario: Ver contexto operativo del turno
- **WHEN** secretaria abre Sala de espera para una fecha y medico
- **THEN** el sistema muestra cada turno con hora, paciente, medico cuando corresponde, DNI, telefono, obra social, tipo, motivo, estado y observaciones breves si existen
- **AND** indica demora o tiempo de espera cuando el turno ya esta en espera o atrasado

#### Scenario: Filtrar recepcion por medico y paciente
- **WHEN** secretaria selecciona un medico o busca un paciente
- **THEN** Sala de espera muestra solo los turnos que coinciden con esos filtros
- **AND** conserva los grupos por estado operativo

### Requirement: Acciones rapidas completas en sala de espera
El sistema SHALL permitir que secretaria ejecute acciones operativas frecuentes desde Sala de espera sin abandonar Gestion de Turnos.

#### Scenario: Avanzar paciente por el circuito de recepcion
- **WHEN** secretaria marca llegada, pasa a consulta o marca atendido desde Sala de espera
- **THEN** el sistema actualiza el estado del turno
- **AND** mueve el turno al grupo correspondiente
- **AND** crea un evento en el historial del turno

#### Scenario: Marcar ausente con motivo
- **WHEN** secretaria intenta marcar un turno como ausente desde Sala de espera
- **THEN** el sistema solicita motivo obligatorio antes de guardar
- **AND** al confirmar actualiza el estado y registra el motivo en el historial

#### Scenario: Cancelar turno con motivo
- **WHEN** secretaria intenta cancelar un turno desde Sala de espera
- **THEN** el sistema solicita motivo obligatorio antes de guardar
- **AND** al confirmar actualiza el estado a `Cancelado` y registra el motivo en el historial
