## Modified Requirements

### Requirement: Detalle, edicion y vista de paciente
El sistema SHALL permitir ver, editar, eliminar e imprimir pacientes desde `/pacientes/[id]`, y SHALL mostrar una ficha clinica optimizada para el medico en modo lectura.

#### Scenario: Ver paciente
- **WHEN** el usuario abre `/pacientes/[id]?mode=view`
- **THEN** el sistema muestra una ficha clinica de lectura con identificacion del paciente, documento, numero de ficha, contacto, cobertura y antecedentes activos
- **AND** muestra metricas de consultas, recetas y ultima atencion
- **AND** muestra acciones directas para crear una nueva consulta, crear una nueva receta, abrir la ficha imprimible y abrir la ultima consulta cuando exista
- **AND** conserva los datos personales, documento, ficha, contacto y cobertura en modo lectura
- **AND** muestra el historial de consultas del paciente
- **AND** muestra las recetas recientes del paciente con acciones para ver e imprimir

#### Scenario: Imprimir ficha clinica
- **WHEN** el usuario abre `/pacientes/[id]/imprimir`
- **THEN** el sistema carga el paciente, consultas y recetas recientes
- **AND** muestra datos del paciente, documento, ficha, contacto, cobertura y antecedentes activos
- **AND** muestra ultimas consultas con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** muestra recetas recientes con fecha, medicamentos, indicaciones y vinculacion a consulta cuando exista
- **AND** permite imprimir la hoja sin mostrar controles de navegacion en la impresion
- **AND** permite volver a la ficha clinica del paciente desde la vista imprimible

#### Scenario: Editar paciente
- **WHEN** el usuario guarda cambios de un paciente
- **THEN** el sistema actualiza `pacientes`
- **AND** valida que el numero de ficha no pertenezca a otro paciente usando `exclude_id`

#### Scenario: Eliminar paciente
- **WHEN** el usuario confirma la eliminacion
- **THEN** el sistema elimina el registro de `pacientes`
- **AND** regresa al listado de pacientes
