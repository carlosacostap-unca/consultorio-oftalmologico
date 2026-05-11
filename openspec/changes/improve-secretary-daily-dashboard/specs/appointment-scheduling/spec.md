## ADDED Requirements

### Requirement: Tablero operativo diario
El sistema SHALL mostrar una vista diaria compacta que resuma la operacion de turnos del dia por medico, estado y disponibilidad.

#### Scenario: Resumen del dia
- **WHEN** la secretaria abre la vista Agenda Diaria
- **THEN** el sistema muestra turnos totales, turnos por estado y disponibilidades del dia
- **AND** los conteos respetan el medico seleccionado y los filtros activos

#### Scenario: Resumen por medico
- **WHEN** la secretaria selecciona `Todos los medicos`
- **THEN** el sistema agrupa la agenda diaria por medico
- **AND** cada seccion muestra cantidad de turnos, disponibilidades y estados relevantes de ese medico

### Requirement: Filtros diarios accionables
El sistema SHALL permitir filtrar la vista diaria por estado operativo y busqueda de paciente sin abandonar la agenda diaria.

#### Scenario: Filtrar por estado
- **WHEN** la secretaria selecciona un filtro de estado en Agenda Diaria
- **THEN** el sistema limita los turnos visibles a ese estado
- **AND** conserva las disponibilidades del medico y fecha para permitir altas rapidas

#### Scenario: Buscar paciente en el dia
- **WHEN** la secretaria escribe nombre, apellido o DNI en el buscador de Agenda Diaria
- **THEN** el sistema muestra solo turnos del dia que coinciden con ese paciente
- **AND** mantiene visibles los indicadores que expliquen el resultado filtrado
