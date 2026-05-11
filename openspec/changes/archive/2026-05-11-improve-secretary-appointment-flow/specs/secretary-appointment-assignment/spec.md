## ADDED Requirements

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
