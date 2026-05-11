## MODIFIED Requirements

### Requirement: Disponibilidades de agenda
El sistema SHALL administrar bloques horarios disponibles para turnos, asociados a un medico agendable.

#### Scenario: Listar disponibilidades por medico
- **WHEN** la secretaria abre `/turnos` y selecciona la vista Disponibilidades
- **THEN** el sistema lista disponibilidades ordenadas por `fecha_hora_inicio` descendente
- **AND** permite filtrar por medico o ver `Todos los medicos`
- **AND** muestra el medico asociado cuando corresponde

#### Scenario: Crear disponibilidad para medico
- **WHEN** la secretaria crea una disponibilidad
- **THEN** el sistema solicita medico antes de fecha, hora de inicio, hora de fin y tipo
- **AND** crea el registro con `medico_id`, `fecha_hora_inicio`, `fecha_hora_fin` y `tipo`

#### Scenario: Disponibilidad visible para medico
- **WHEN** un usuario con rol activo `medico` abre su agenda
- **THEN** el sistema muestra por defecto solo disponibilidades asociadas a su usuario

### Requirement: Listado de turnos
El sistema SHALL mostrar turnos con vistas de lista, diaria, semanal y disponibilidades, permitiendo filtrar por paciente, fecha y medico.

#### Scenario: Cargar agenda multi-medico para secretaria
- **WHEN** una secretaria abre `/turnos`
- **THEN** el sistema carga medicos desde usuarios con rol `medico`
- **AND** carga `turnos` ordenados por `fecha_hora` con `paciente_id` y `medico_id` expandidos
- **AND** carga disponibilidades ordenadas por `fecha_hora_inicio` con `medico_id` expandido

#### Scenario: Filtrar agenda por medico
- **WHEN** la secretaria selecciona un medico especifico
- **THEN** el sistema limita turnos y disponibilidades visibles a ese medico

#### Scenario: Ver todos los medicos
- **WHEN** la secretaria selecciona `Todos los medicos`
- **THEN** el sistema muestra turnos y disponibilidades de todos los medicos
- **AND** cada turno y disponibilidad identifica visualmente al medico asociado

### Requirement: Creacion de turno
El sistema SHALL permitir agendar turnos vinculados a paciente, disponibilidad y medico.

#### Scenario: Crear turno regular desde disponibilidad
- **WHEN** la secretaria crea un turno desde una disponibilidad
- **THEN** el sistema preselecciona el medico de la disponibilidad
- **AND** crea el turno con `medico_id` igual al de la disponibilidad
- **AND** conserva `disponibilidad_id`

#### Scenario: Crear turno regular desde flujo general
- **WHEN** la secretaria crea un turno desde `Nuevo Turno`
- **THEN** el sistema solicita medico como decision temprana
- **AND** muestra disponibilidades compatibles con el medico seleccionado
- **AND** crea el turno con `medico_id`, paciente, fecha/hora, tipo, duracion, estado, motivo, observaciones y `disponibilidad_id`

#### Scenario: Crear turno para paciente nuevo
- **WHEN** la secretaria no encuentra al paciente durante el otorgamiento del turno
- **THEN** el sistema permite crear un paciente minimo sin salir del flujo
- **AND** selecciona automaticamente el nuevo paciente para el turno

## ADDED Requirements

### Requirement: Medicos agendables
El sistema SHALL considerar medico agendable a todo usuario que incluya `medico` en sus roles.

#### Scenario: Cargar medicos agendables
- **WHEN** la agenda necesita mostrar medicos
- **THEN** el sistema obtiene usuarios cuyo campo `roles` incluye `medico`
- **AND** usa esos usuarios para filtros y asignacion de turnos/disponibilidades

#### Scenario: Secretaria gestiona todos los medicos
- **WHEN** un usuario con rol activo `secretaria` abre la agenda
- **THEN** puede ver y gestionar turnos y disponibilidades de todos los medicos agendables
