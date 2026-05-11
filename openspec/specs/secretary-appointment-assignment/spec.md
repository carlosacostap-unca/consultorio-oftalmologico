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

### Requirement: Sala de espera operativa
El sistema SHALL ofrecer a secretaria una vista de sala de espera para seguir pacientes del dia por estado operativo.

#### Scenario: Abrir sala de espera
- **WHEN** una secretaria abre Gestion de Turnos
- **THEN** el sistema ofrece una opcion de vista llamada Sala de espera
- **AND** la vista usa la fecha seleccionada o la fecha actual si no hay fecha seleccionada

#### Scenario: Agrupar pacientes por estado
- **WHEN** la secretaria abre Sala de espera
- **THEN** el sistema agrupa los turnos del dia en proximos, en espera, en consulta, atendidos, ausentes y cancelados
- **AND** cada grupo muestra su cantidad de turnos

#### Scenario: Ver contexto del paciente
- **WHEN** un turno aparece en Sala de espera
- **THEN** el sistema muestra hora, paciente, medico, tipo, estado y motivo
- **AND** si se esta viendo `Todos los medicos`, identifica el medico del turno

### Requirement: Acciones de recepcion
El sistema SHALL permitir que secretaria actualice estados del dia desde Sala de espera sin abandonar Gestion de Turnos.

#### Scenario: Marcar llegada
- **WHEN** secretaria marca un turno como llego desde Sala de espera
- **THEN** el sistema actualiza el estado del turno a `En espera`
- **AND** mueve el turno al grupo En espera

#### Scenario: Pasar a consulta
- **WHEN** secretaria pasa un turno a consulta desde Sala de espera
- **THEN** el sistema actualiza el estado del turno a `En consulta`
- **AND** mueve el turno al grupo En consulta

#### Scenario: Marcar cierre operativo
- **WHEN** secretaria marca un turno como atendido o ausente desde Sala de espera
- **THEN** el sistema actualiza el estado correspondiente
- **AND** mantiene disponible la accion de gestionar turno

### Requirement: Trazabilidad en operaciones de secretaria
El sistema SHALL dejar trazabilidad visible de las acciones realizadas por secretaria sobre turnos del dia.

#### Scenario: Secretaria marca llegada
- **WHEN** secretaria marca que un paciente llego desde Sala de espera o Agenda Diaria
- **THEN** el sistema actualiza el turno a `En espera`
- **AND** crea un evento visible en el historial del turno

#### Scenario: Secretaria pasa paciente a consulta
- **WHEN** secretaria pasa un paciente a `En consulta`
- **THEN** el sistema actualiza el estado del turno
- **AND** crea un evento visible en el historial del turno

#### Scenario: Secretaria marca ausencia
- **WHEN** secretaria intenta marcar un turno como `Ausente`
- **THEN** el sistema solicita motivo de ausencia antes de guardar
- **AND** crea un evento con ese motivo si confirma la accion

### Requirement: Historial accesible durante gestion diaria
El sistema SHALL permitir que secretaria consulte el historial del turno sin abandonar Gestion de Turnos.

#### Scenario: Ver historial desde Gestionar
- **WHEN** secretaria abre `Gestionar` en un turno de Agenda Diaria o Sala de espera
- **THEN** el modal muestra una seccion de historial operativo
- **AND** la seccion lista los eventos del turno ordenados por fecha

#### Scenario: Continuar operando con historial visible
- **WHEN** secretaria esta viendo el historial de un turno
- **THEN** puede volver a datos, cancelacion o reprogramacion sin cerrar el modal

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

### Requirement: Listado diario imprimible por medico
El sistema SHALL permitir que secretaria genere un listado imprimible de turnos por fecha y medico.

#### Scenario: Imprimir agenda de un medico
- **WHEN** secretaria abre el modal de impresion desde Gestion de Turnos y selecciona una fecha y un medico
- **THEN** el sistema abre un listado imprimible con solo los turnos de ese medico para esa fecha
- **AND** muestra hora, paciente, DNI, telefono, obra social, tipo, motivo, estado y observaciones segun los campos elegidos

#### Scenario: Imprimir todas las agendas
- **WHEN** secretaria selecciona `Todos los medicos` en el modal de impresion
- **THEN** el sistema abre un listado imprimible agrupado por medico
- **AND** cada grupo muestra sus turnos ordenados por hora

#### Scenario: Imprimir desde contexto actual
- **WHEN** secretaria esta filtrando Gestion de Turnos por medico y abre el modal de impresion
- **THEN** el medico del modal queda preseleccionado con el medico actual
- **AND** la fecha queda preseleccionada con la fecha activa o la fecha actual si no habia fecha

### Requirement: Ficha rapida de paciente desde Gestion de Turnos
El sistema SHALL permitir que secretaria consulte una ficha rapida del paciente sin abandonar Gestion de Turnos.

#### Scenario: Abrir ficha desde un turno
- **WHEN** secretaria selecciona la accion de ficha rapida sobre un paciente en Agenda Diaria, Sala de espera, Lista o el modal de gestion de turno
- **THEN** el sistema muestra nombre, documento, telefono, email, obra social, afiliado, domicilio y numero de ficha
- **AND** conserva el contexto actual de Gestion de Turnos en segundo plano

#### Scenario: Ver actividad reciente
- **WHEN** la ficha rapida se abre para un paciente con actividad
- **THEN** el sistema muestra ultimos turnos y ultimas consultas del paciente
- **AND** ofrece enlaces a la ficha completa del paciente y a nueva consulta

### Requirement: Correccion administrativa rapida del paciente
El sistema SHALL permitir que secretaria corrija datos administrativos minimos del paciente desde la ficha rapida.

#### Scenario: Guardar datos minimos
- **WHEN** secretaria edita telefono, email, obra social, documento u otro dato administrativo minimo y guarda
- **THEN** el sistema actualiza el paciente
- **AND** refleja los nuevos datos en los turnos visibles del paciente

#### Scenario: Error al guardar
- **WHEN** PocketBase rechaza la actualizacion del paciente
- **THEN** el sistema informa que no se pudieron guardar los cambios
- **AND** mantiene la ficha rapida abierta para corregir o reintentar

