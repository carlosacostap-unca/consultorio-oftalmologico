## ADDED Requirements

### Requirement: Vista de turnos por estado del dia
El sistema SHALL permitir visualizar turnos del dia por estado operativo, respetando filtros de medico y fecha.

#### Scenario: Filtrar sala de espera por medico
- **WHEN** secretaria selecciona un medico especifico en Gestion de Turnos
- **THEN** Sala de espera muestra solo turnos de ese medico para la fecha seleccionada

#### Scenario: Ver sala de espera multi-medico
- **WHEN** secretaria selecciona `Todos los medicos`
- **THEN** Sala de espera incluye turnos de todos los medicos agendables
- **AND** cada turno identifica el medico asignado

#### Scenario: Resumen operativo del dia
- **WHEN** Sala de espera carga turnos del dia
- **THEN** el sistema muestra conteos de proximos, en espera, en consulta, atendidos, ausentes y cancelados
- **AND** destaca el proximo turno o informa que no hay turnos pendientes

### Requirement: Transiciones de estado desde sala de espera
El sistema SHALL reflejar en la agenda los cambios de estado realizados desde Sala de espera.

#### Scenario: Cambio de estado local y persistente
- **WHEN** secretaria cambia el estado de un turno desde Sala de espera
- **THEN** el sistema persiste el cambio en PocketBase
- **AND** actualiza la interfaz localmente sin recargar la pagina

#### Scenario: Mantener acciones existentes
- **WHEN** un turno se muestra en Sala de espera
- **THEN** el sistema permite abrir el modal de gestion del turno
- **AND** conserva las acciones existentes de reprogramacion, cancelacion y edicion
