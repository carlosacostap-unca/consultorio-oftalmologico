# secretary-appointment-assignment Specification

## Purpose
TBD - created by archiving change improve-secretary-appointment-flow. Update Purpose after archive.
## Requirements
### Requirement: Flujo guiado de otorgamiento de turno
El sistema SHALL permitir que la secretaria otorgue un turno siguiendo el orden medico, fecha, disponibilidad, horario y paciente.

#### Scenario: Secretaria inicia alta general de turno
- **WHEN** una secretaria abre `/turnos/nuevo` sin parametros
- **THEN** el sistema muestra primero selector de medico y fecha
- **AND** no permite seleccionar disponibilidad ni horario hasta que haya medico y fecha

#### Scenario: Secretaria abre alta desde una disponibilidad
- **WHEN** una secretaria abre `/turnos/nuevo` con `disponibilidad_id` y `medico_id`
- **THEN** el sistema preselecciona el medico y la disponibilidad
- **AND** muestra los horarios del bloque seleccionado

### Requirement: Horarios libres y ocupados
El sistema SHALL mostrar horarios calculados para la disponibilidad seleccionada indicando si estan libres u ocupados.

#### Scenario: Disponibilidad con horarios libres
- **WHEN** la secretaria selecciona una disponibilidad con duracion definida
- **THEN** el sistema muestra intervalos dentro de `fecha_hora_inicio` y `fecha_hora_fin`
- **AND** permite elegir solo intervalos libres para turno regular

#### Scenario: Horario ocupado
- **WHEN** un intervalo ya tiene un turno para el mismo medico
- **THEN** el sistema lo muestra como ocupado
- **AND** no lo selecciona como turno regular

### Requirement: Sobreturno explicito
El sistema SHALL permitir crear sobreturnos solo mediante una decision explicita del usuario.

#### Scenario: Crear sobreturno en horario ocupado
- **WHEN** la secretaria elige crear sobreturno sobre un horario ocupado
- **THEN** el sistema activa `es_sobreturno`
- **AND** pide confirmar tipo de sobreturno antes de guardar

#### Scenario: Crear turno regular libre
- **WHEN** la secretaria selecciona un horario libre
- **THEN** el sistema guarda el turno con `es_sobreturno` desactivado
- **AND** asocia el turno al medico y disponibilidad seleccionados

### Requirement: Paciente dentro del flujo
El sistema SHALL permitir buscar, seleccionar, crear o actualizar paciente sin abandonar el flujo de otorgamiento.

#### Scenario: Seleccionar paciente existente
- **WHEN** la secretaria busca por nombre, apellido o DNI
- **THEN** el sistema muestra coincidencias
- **AND** al elegir una coincidencia la usa como paciente del turno

#### Scenario: Crear paciente minimo
- **WHEN** la secretaria crea un paciente desde el alta de turno
- **THEN** el sistema guarda el paciente
- **AND** lo selecciona automaticamente en el turno en curso

### Requirement: Confirmacion de turno otorgado
El sistema SHALL mostrar una confirmacion clara antes o despues de guardar el turno con medico, fecha, hora, paciente y tipo.

#### Scenario: Guardado exitoso
- **WHEN** la secretaria guarda un turno valido
- **THEN** el sistema crea el turno
- **AND** vuelve a la gestion de turnos preservando el medico o la pestaña de origen cuando aplique

#### Scenario: Datos incompletos
- **WHEN** faltan medico, fecha, horario o paciente
- **THEN** el sistema bloquea el guardado
- **AND** muestra el campo pendiente de resolver

### Requirement: Seguimiento operativo desde agenda diaria
El sistema SHALL permitir que la secretaria use Agenda Diaria como punto principal para seguimiento y acciones inmediatas sobre turnos del dia.

#### Scenario: Acciones visibles sobre turno del dia
- **WHEN** la agenda diaria muestra un turno otorgado
- **THEN** el sistema ofrece acciones rapidas para gestionar estado, abrir detalles, cancelar o reprogramar segun corresponda
- **AND** las acciones preservan la fecha y el medico actual al volver a la agenda

#### Scenario: Alta rapida desde disponibilidad diaria
- **WHEN** la agenda diaria muestra un slot libre dentro de una disponibilidad
- **THEN** la secretaria puede iniciar alta rapida de turno desde ese slot
- **AND** el sistema precarga medico, fecha, hora, disponibilidad y tipo

### Requirement: Alta rapida contextual desde agenda diaria
El sistema SHALL mostrar un modal de alta rapida con contexto operativo completo antes de guardar un turno iniciado desde Agenda Diaria.

#### Scenario: Resumen visible del turno
- **WHEN** la secretaria abre alta rapida desde un slot libre de Agenda Diaria
- **THEN** el sistema muestra un resumen con medico, fecha, hora, tipo, disponibilidad y modo regular
- **AND** el resumen permanece visible mientras la secretaria selecciona paciente y completa el motivo

#### Scenario: Sobreturno contextualizado
- **WHEN** la secretaria abre alta rapida desde un slot ocupado de Agenda Diaria
- **THEN** el sistema muestra que se esta creando un sobreturno
- **AND** muestra el paciente o contexto del turno ocupado cuando este disponible
- **AND** solicita tipo de sobreturno antes de guardar

### Requirement: Seleccion de paciente asistida
El sistema SHALL permitir buscar, seleccionar o crear paciente dentro del modal de alta rapida con estados claros.

#### Scenario: Seleccionar paciente existente
- **WHEN** la secretaria busca un paciente por nombre, apellido, DNI o telefono
- **THEN** el sistema muestra coincidencias escaneables con datos de identificacion
- **AND** al seleccionar una coincidencia muestra una seccion de paciente seleccionado

#### Scenario: Busqueda sin resultados
- **WHEN** la busqueda de paciente no devuelve coincidencias
- **THEN** el sistema informa que no encontro pacientes para esa busqueda
- **AND** mantiene disponible la accion para crear un paciente minimo

#### Scenario: Crear paciente minimo
- **WHEN** la secretaria crea un paciente minimo desde el modal
- **THEN** el sistema guarda el paciente
- **AND** lo selecciona automaticamente como paciente del turno en curso

### Requirement: Confirmacion operativa de alta rapida
El sistema SHALL confirmar el resultado del alta rapida y mantener actualizada la agenda diaria.

#### Scenario: Turno creado desde slot libre
- **WHEN** la secretaria guarda un turno valido desde el modal de alta rapida
- **THEN** el sistema crea el turno
- **AND** muestra confirmacion con paciente, medico, fecha y hora
- **AND** refleja el nuevo turno en la agenda diaria sin abandonar `/turnos`

#### Scenario: Advertencias antes de guardar
- **WHEN** el paciente seleccionado tiene turnos activos cercanos o en el mismo dia
- **THEN** el sistema muestra advertencias antes de guardar
- **AND** bloquea el guardado hasta que la secretaria confirme que reviso las advertencias

