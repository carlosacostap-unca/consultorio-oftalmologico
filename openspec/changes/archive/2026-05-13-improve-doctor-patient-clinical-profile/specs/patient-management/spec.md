## Modified Requirements

### Requirement: Detalle, edicion y vista de paciente
El sistema SHALL permitir ver, editar y eliminar pacientes desde `/pacientes/[id]`, y SHALL mostrar una ficha clinica optimizada para el medico en modo lectura.

#### Scenario: Ver paciente
- **WHEN** el usuario abre `/pacientes/[id]?mode=view`
- **THEN** el sistema muestra una ficha clinica de lectura con identificacion del paciente, documento, numero de ficha, contacto, cobertura y antecedentes activos
- **AND** muestra metricas de consultas, recetas y ultima atencion
- **AND** muestra acciones directas para crear una nueva consulta, crear una nueva receta, imprimir la ficha y abrir la ultima consulta cuando exista
- **AND** conserva los datos personales, documento, ficha, contacto y cobertura en modo lectura
- **AND** muestra el historial de consultas del paciente
- **AND** muestra las recetas recientes del paciente con acciones para ver e imprimir

#### Scenario: Editar paciente
- **WHEN** el usuario guarda cambios de un paciente
- **THEN** el sistema actualiza `pacientes`
- **AND** valida que el numero de ficha no pertenezca a otro paciente usando `exclude_id`

#### Scenario: Eliminar paciente
- **WHEN** el usuario confirma la eliminacion
- **THEN** el sistema elimina el registro de `pacientes`
- **AND** regresa al listado de pacientes

### Requirement: Historial clinico desde paciente
El sistema SHALL mostrar las consultas del paciente ordenadas por fecha descendente, una continuidad clinica resumida y sus recetas recientes asociadas.

#### Scenario: Paciente con consultas
- **WHEN** el paciente tiene consultas registradas
- **THEN** el sistema muestra su continuidad clinica reciente con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** muestra su historial con fecha, motivo y diagnostico
- **AND** cada consulta permite abrir la consulta en modo vista

#### Scenario: Paciente con recetas
- **WHEN** el paciente tiene recetas registradas
- **THEN** el sistema muestra las recetas mas recientes con fecha, indicacion resumida y vinculacion con consulta cuando exista
- **AND** cada receta permite abrir su detalle en modo vista
- **AND** cada receta permite abrir su version imprimible

#### Scenario: Nueva consulta desde ficha
- **WHEN** el usuario elige crear consulta desde el detalle del paciente
- **THEN** el sistema navega a `/consultas/nueva?paciente_id=<id>`

#### Scenario: Nueva receta desde ficha
- **WHEN** el usuario elige crear receta desde el detalle del paciente
- **THEN** el sistema navega a `/recetas/nueva?paciente_id=<id>`
