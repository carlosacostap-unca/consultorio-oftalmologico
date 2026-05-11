## ADDED Requirements

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
