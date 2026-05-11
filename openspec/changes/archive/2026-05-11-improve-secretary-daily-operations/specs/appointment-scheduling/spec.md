## MODIFIED Requirements

### Requirement: Listado de turnos
El sistema SHALL mostrar turnos con vistas de lista, diaria y semanal, filtros por paciente y fecha, actualizacion en tiempo real, y una vista diaria operativa para secretaria.

#### Scenario: Cargar agenda
- **WHEN** el usuario abre `/turnos`
- **THEN** el sistema carga `turnos` ordenados por `fecha_hora` con paciente expandido
- **AND** carga disponibilidades ordenadas por `fecha_hora_inicio`

#### Scenario: Filtrar por paciente y fecha
- **WHEN** el usuario filtra por paciente o fecha
- **THEN** el sistema limita los turnos visibles segun nombre, apellido, DNI o dia seleccionado
- **AND** en vista semanal compara contra la semana que contiene la fecha base

#### Scenario: Cambios en tiempo real
- **WHEN** PocketBase emite cambios en `turnos`
- **THEN** el sistema recarga la agenda y mantiene los turnos ordenados

#### Scenario: Resumen operativo diario
- **WHEN** el usuario abre la vista diaria
- **THEN** el sistema muestra resumen del dia y por medico con totales por estado operativo
- **AND** incluye cantidad de sobreturnos y turnos atrasados

#### Scenario: Filtros operativos diarios
- **WHEN** el usuario selecciona un filtro rapido de la vista diaria
- **THEN** el sistema muestra solo los turnos que coinciden con ese estado operativo
- **AND** conserva las disponibilidades visibles para cargar nuevos turnos

#### Scenario: Acciones rapidas de estado
- **WHEN** el usuario usa una accion rapida de estado sobre un turno diario
- **THEN** el sistema actualiza el estado del turno
- **AND** refleja el cambio localmente en el tablero
