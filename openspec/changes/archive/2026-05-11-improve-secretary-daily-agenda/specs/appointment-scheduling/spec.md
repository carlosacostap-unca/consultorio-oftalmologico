## MODIFIED Requirements

### Requirement: Listado de turnos
El sistema SHALL mostrar turnos con vistas de lista, diaria y semanal, filtros por paciente, medico y fecha, y actualizacion en tiempo real.

#### Scenario: Cargar agenda diaria multi-medico para secretaria
- **WHEN** una secretaria abre `/turnos` en vista diaria
- **AND** el filtro de medico esta en "Todos los medicos"
- **THEN** el sistema agrupa el dia por medico
- **AND** cada grupo muestra los turnos y disponibilidades de ese medico para la fecha seleccionada
- **AND** no mezcla turnos de distintos medicos sin identificar el medico responsable

#### Scenario: Cargar agenda diaria de un medico
- **WHEN** el usuario abre la vista diaria con un medico especifico seleccionado
- **THEN** el sistema muestra los turnos y disponibilidades del dia solo para ese medico
- **AND** mantiene acciones de cambio de estado y apertura del turno existente

#### Scenario: Crear turno desde disponibilidad diaria
- **WHEN** el usuario selecciona crear turno desde un bloque de disponibilidad en la vista diaria
- **THEN** el sistema navega al alta de turno con medico, fecha/hora, disponibilidad y tipo precargados
