## MODIFIED Requirements

### Requirement: Creacion de turno
El sistema SHALL permitir agendar turnos vinculados a paciente y disponibilidad, con busqueda informativa de pacientes, alta rapida y advertencias operativas antes de confirmar.

#### Scenario: Crear turno regular
- **WHEN** el usuario selecciona paciente, fecha, disponibilidad, hora y duracion
- **THEN** el sistema valida que la hora este dentro del rango de disponibilidad
- **AND** crea el turno con fecha/hora ISO, tipo, duracion, estado, motivo, observaciones y `disponibilidad_id`

#### Scenario: Buscar paciente para turno
- **WHEN** el usuario busca un paciente durante el otorgamiento de un turno
- **THEN** el sistema busca por nombre, apellido, DNI/numero de documento o telefono
- **AND** muestra resultados con nombre completo, documento, telefono y obra social cuando existan

#### Scenario: Crear paciente durante turno
- **WHEN** el paciente no existe durante la carga de turno
- **THEN** el sistema permite crear un paciente minimo desde el flujo de otorgamiento
- **AND** selecciona automaticamente el nuevo paciente para el turno

#### Scenario: Avisar turnos existentes del paciente
- **WHEN** el usuario selecciona un paciente y una fecha para el turno
- **THEN** el sistema muestra una advertencia informativa si ese paciente ya tiene turnos en esa fecha
- **AND** no bloquea la creacion del turno por esa advertencia

#### Scenario: Avisar proximos turnos activos
- **WHEN** el usuario selecciona un paciente para otorgar un turno
- **THEN** el sistema muestra proximos turnos activos del paciente cuando existan
- **AND** destaca si alguno corresponde al mismo medico

#### Scenario: Confirmar guardado con advertencias
- **WHEN** existen advertencias activas para el paciente seleccionado
- **THEN** el sistema solicita una confirmacion explicita antes de guardar el turno
- **AND** guarda el turno solo cuando la confirmacion fue marcada

#### Scenario: Editar datos del paciente durante turno
- **WHEN** el usuario modifica datos del paciente seleccionado desde el formulario de turno
- **THEN** el sistema actualiza el registro de `pacientes`
- **AND** mantiene seleccionado al paciente actualizado
