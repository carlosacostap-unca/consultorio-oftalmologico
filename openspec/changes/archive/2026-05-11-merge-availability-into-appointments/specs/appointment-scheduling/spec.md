## MODIFIED Requirements

### Requirement: Disponibilidades de agenda
El sistema SHALL administrar bloques horarios disponibles para turnos desde la pantalla `/turnos`.

#### Scenario: Listar disponibilidades
- **WHEN** el usuario abre `/turnos` y selecciona la vista Disponibilidades
- **THEN** el sistema lista `disponibilidades` ordenadas por `fecha_hora_inicio` descendente
- **AND** muestra fecha, hora de inicio, hora de fin y tipo

#### Scenario: Crear disponibilidad
- **WHEN** el usuario completa fecha, hora de inicio, hora de fin y tipo desde la vista Disponibilidades de `/turnos`
- **THEN** el sistema crea un registro con `fecha_hora_inicio`, `fecha_hora_fin` y `tipo`
- **AND** actualiza el listado integrado de disponibilidades

#### Scenario: Eliminar disponibilidad
- **WHEN** el usuario confirma eliminar una disponibilidad desde `/turnos`
- **THEN** el sistema elimina el registro
- **AND** advierte que turnos asignados podrian quedar sin disponibilidad asociada

### Requirement: Listado de turnos
El sistema SHALL mostrar turnos con vistas de lista, diaria, semanal y disponibilidades, filtros por paciente y fecha, y actualizacion en tiempo real.

#### Scenario: Cargar agenda
- **WHEN** el usuario abre `/turnos`
- **THEN** el sistema carga `turnos` ordenados por `fecha_hora` con paciente expandido
- **AND** carga disponibilidades ordenadas por `fecha_hora_inicio`

#### Scenario: Vista de disponibilidades integrada
- **WHEN** el usuario selecciona la vista Disponibilidades
- **THEN** la pantalla muestra la gestion de disponibilidades sin navegar a otra ruta
