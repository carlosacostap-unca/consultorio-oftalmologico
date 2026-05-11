# Appointment Scheduling Specification

## Purpose
Define la agenda de turnos, disponibilidades, sobreturnos, estados e impresion de listados diarios.
## Requirements
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

### Requirement: Estados y acciones rapidas de turno
El sistema SHALL permitir editar motivo, observaciones y estado de un turno desde el listado, y SHALL separar la edicion, reprogramacion y cancelacion en areas operativas distintas dentro del modal de turno.

#### Scenario: Cambiar estado
- **WHEN** el usuario selecciona un estado para un turno
- **THEN** el sistema actualiza `estado` en `turnos`
- **AND** refleja el cambio localmente

#### Scenario: Modal de turno
- **WHEN** el usuario abre el modal de un turno
- **THEN** el sistema muestra datos del paciente, hora, tipo, estado, motivo y observaciones
- **AND** permite guardar cambios o eliminar el turno

#### Scenario: Acciones separadas del modal
- **WHEN** el usuario abre el modal de un turno
- **THEN** el sistema muestra secciones separadas para datos, reprogramacion y cancelacion
- **AND** las acciones de cancelar o eliminar no quedan mezcladas con la edicion de motivo, observaciones y estado

#### Scenario: Reprogramar desde seccion dedicada
- **WHEN** el usuario entra a la seccion de reprogramacion del modal
- **THEN** el sistema permite elegir medico, fecha, disponibilidad y slot libre
- **AND** mantiene las validaciones actuales antes de guardar la reprogramacion

#### Scenario: Cancelar desde seccion dedicada
- **WHEN** el usuario entra a la seccion de cancelacion del modal
- **THEN** el sistema solicita un motivo de cancelacion
- **AND** permite cancelar el turno solo si el motivo fue completado

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

### Requirement: Edicion y vista de turno
El sistema SHALL permitir ver, editar o reprogramar un turno existente desde `/turnos/[id]` o desde la agenda diaria.

#### Scenario: Reprogramar turno desde agenda diaria
- **WHEN** el usuario abre el modal de gestion de un turno desde la agenda diaria
- **AND** selecciona fecha, medico y un slot libre de disponibilidad
- **AND** confirma reprogramar
- **THEN** el sistema actualiza el mismo turno con nueva fecha/hora, medico, disponibilidad, tipo y duracion
- **AND** conserva el registro historico del turno
- **AND** agrega una nota en observaciones indicando la reprogramacion

#### Scenario: Bloquear reprogramacion hacia slot ocupado
- **WHEN** un slot esta ocupado por otro turno del mismo medico
- **THEN** el sistema no permite seleccionarlo como destino de reprogramacion

### Requirement: Sobreturnos
El sistema SHALL permitir crear turnos marcados como sobreturno desde el formulario completo o desde un slot ocupado de la agenda diaria.

#### Scenario: Crear sobreturno desde slot ocupado
- **WHEN** el usuario selecciona un slot ocupado en la agenda diaria
- **THEN** el sistema abre el modal de alta rapida en modo sobreturno
- **AND** muestra contexto del turno existente cuando esta disponible
- **AND** precarga medico, fecha/hora, disponibilidad y tipo
- **WHEN** el usuario guarda con paciente, motivo y tipo de sobreturno
- **THEN** el sistema crea un turno con `es_sobreturno: true`
- **AND** guarda `sobreturno_tipo`
- **AND** refresca la agenda visible sin abandonar `/turnos`

#### Scenario: Distinguir sobreturno en agenda diaria
- **WHEN** la agenda diaria muestra un turno marcado como sobreturno
- **THEN** el sistema lo identifica visualmente como sobreturno

### Requirement: Impresion de turnos
El sistema SHALL generar un listado imprimible de turnos por fecha con columnas seleccionables.

#### Scenario: Abrir impresion desde agenda
- **WHEN** el usuario selecciona fecha y campos a imprimir
- **THEN** el sistema abre `/turnos/imprimir?date=<fecha>&fields=<campos>`

#### Scenario: Imprimir listado diario
- **WHEN** la pagina de impresion carga una fecha valida
- **THEN** consulta turnos del dia con paciente expandido
- **AND** ejecuta `window.print()` tras renderizar

### Requirement: Pruebas Playwright contra PocketBase de testing
El sistema SHALL ejecutar las pruebas automatizadas de turnos contra una instancia PocketBase de testing cuando se use el script de testing.

#### Scenario: Ejecutar Playwright en testing
- **WHEN** el desarrollador ejecuta el script Playwright de testing
- **THEN** el sistema carga `.env.test.local` antes de iniciar Next.js
- **AND** las pruebas usan la URL y credenciales PocketBase de testing

#### Scenario: Bloquear Playwright contra produccion
- **WHEN** las pruebas detectan una URL PocketBase que parece produccion
- **THEN** el sistema aborta antes de ejecutar flujos que escriben datos
- **AND** informa que debe configurarse una instancia de testing

### Requirement: Medicos agendables
El sistema SHALL considerar medico agendable a todo usuario que incluya `medico` en sus roles.

#### Scenario: Cargar medicos agendables
- **WHEN** la agenda necesita mostrar medicos
- **THEN** el sistema obtiene usuarios cuyo campo `roles` incluye `medico`
- **AND** usa esos usuarios para filtros y asignacion de turnos/disponibilidades

#### Scenario: Secretaria gestiona todos los medicos
- **WHEN** un usuario con rol activo `secretaria` abre la agenda
- **THEN** puede ver y gestionar turnos y disponibilidades de todos los medicos agendables

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

### Requirement: Alta rapida consistente con disponibilidad
El sistema SHALL crear turnos desde el modal de alta rapida respetando la disponibilidad, medico y horario seleccionados en Agenda Diaria.

#### Scenario: Crear turno regular desde slot libre diario
- **WHEN** la secretaria guarda un turno regular desde un slot libre de Agenda Diaria
- **THEN** el sistema crea el turno con `medico_id`, `disponibilidad_id`, `fecha_hora`, `tipo`, `duracion`, paciente y motivo
- **AND** el turno queda marcado como no sobreturno

#### Scenario: Bloquear turno regular superpuesto
- **WHEN** la secretaria intenta guardar un turno regular que se superpone con otro turno del mismo medico
- **THEN** el sistema bloquea el guardado
- **AND** informa que el horario se superpone con otro turno

### Requirement: Sobreturno rapido desde slot ocupado
El sistema SHALL permitir crear un sobreturno desde un slot ocupado de Agenda Diaria solo cuando el usuario lo inicia explicitamente desde ese slot.

#### Scenario: Crear sobreturno desde slot ocupado diario
- **WHEN** la secretaria guarda un sobreturno desde un slot ocupado de Agenda Diaria
- **THEN** el sistema crea el turno con `es_sobreturno: true`
- **AND** guarda `sobreturno_tipo`, medico, disponibilidad, fecha/hora, paciente y motivo
- **AND** conserva visible el contexto del turno ocupado durante la carga

#### Scenario: Refrescar ocupacion tras alta rapida
- **WHEN** se crea un turno regular o sobreturno desde el modal de alta rapida
- **THEN** la agenda diaria actualiza el listado de turnos
- **AND** los slots de disponibilidad reflejan la nueva ocupacion sin recargar la pagina manualmente

