## MODIFIED Requirements

### Requirement: Disponibilidades de agenda
El sistema SHALL administrar bloques horarios disponibles para turnos desde la pantalla `/turnos` y un detalle por disponibilidad.

#### Scenario: Listar disponibilidades
- **WHEN** el usuario abre `/turnos` y selecciona la vista Disponibilidades
- **THEN** el sistema lista `disponibilidades` ordenadas por `fecha_hora_inicio` descendente
- **AND** muestra fecha, hora de inicio, hora de fin, tipo y cantidad de turnos otorgados
- **AND** no muestra una columna de acciones

#### Scenario: Abrir detalle de disponibilidad
- **WHEN** el usuario selecciona una fila de disponibilidad
- **THEN** el sistema navega a `/turnos/disponibilidades/<id>`

#### Scenario: Ver detalle de disponibilidad
- **WHEN** el usuario abre el detalle de una disponibilidad
- **THEN** el sistema muestra fecha, horario, tipo y listado de turnos otorgados vinculados por `disponibilidad_id`
- **AND** el listado de turnos otorgados incluye los turnos vinculados aunque no tengan paciente asignado
- **AND** los turnos sin paciente muestran `Sin paciente asignado` en la columna Paciente
- **AND** muestra los datos de la disponibilidad en modo lectura
- **AND** muestra las acciones `Editar` y `Eliminar`
- **AND** no muestra la accion `Guardar cambios`

#### Scenario: Habilitar edicion de disponibilidad
- **WHEN** el usuario presiona `Editar`
- **THEN** el sistema habilita los campos fecha, hora inicio, hora fin y tipo
- **AND** muestra la accion `Guardar cambios`

#### Scenario: Guardar edicion de disponibilidad
- **WHEN** el usuario modifica fecha, hora inicio, hora fin o tipo en modo edicion y guarda
- **THEN** el sistema actualiza la disponibilidad
- **AND** mantiene al usuario en la pantalla de detalle con los datos actualizados
- **AND** vuelve a mostrar los datos en modo lectura

#### Scenario: Eliminar disponibilidad
- **WHEN** el usuario confirma eliminar una disponibilidad desde el detalle
- **THEN** el sistema elimina el registro
- **AND** vuelve a `/turnos?tab=availability`
- **AND** la pantalla de turnos muestra la pestaña Disponibilidades

#### Scenario: Volver desde detalle de disponibilidad
- **WHEN** el usuario vuelve desde el detalle de una disponibilidad
- **THEN** el sistema navega a `/turnos?tab=availability`
- **AND** la pantalla de turnos muestra la pestaña Disponibilidades
