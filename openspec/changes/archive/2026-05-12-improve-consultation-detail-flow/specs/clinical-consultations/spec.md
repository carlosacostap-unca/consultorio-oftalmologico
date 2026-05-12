## MODIFIED Requirements

### Requirement: Navegacion clinica entre consultas
El sistema SHALL permitir navegar dentro del historial de consultas del mismo paciente y revisar una consulta existente con contexto clinico resumido y continuidad de acciones.

#### Scenario: Consultas relacionadas del paciente
- **WHEN** se abre una consulta existente
- **THEN** el sistema carga las consultas del mismo paciente ordenadas por fecha y creacion
- **AND** identifica primera, anterior y posterior respecto de la consulta actual

#### Scenario: Resumen de consulta existente
- **WHEN** se abre una consulta existente
- **THEN** el sistema muestra una cabecera con paciente, fecha, edad, ficha y obra social cuando esten disponibles
- **AND** muestra un resumen clinico con motivo, diagnostico, tratamiento, PIO, AV, refraccion y antecedentes activos
- **AND** muestra un panel de continuidad clinica con estado de diagnostico, tratamiento, recetas emitidas y datos clave del paciente

#### Scenario: Acciones clinicas desde detalle
- **WHEN** se abre una consulta existente
- **THEN** el sistema permite crear receta vinculada a la consulta y al paciente
- **AND** permite imprimir anteojos desde la consulta
- **AND** permite abrir el paciente y crear una nueva consulta para el mismo paciente
- **AND** mantiene esas acciones visibles en el panel de continuidad

### Requirement: Recetas asociadas a consulta
El sistema SHALL mostrar recetas emitidas para una consulta y permitir crear nuevas recetas vinculadas.

#### Scenario: Consulta con recetas
- **WHEN** una consulta tiene recetas con `consulta_id`
- **THEN** el sistema las muestra con fecha, medicamentos, indicaciones y acceso a su vista

#### Scenario: Crear receta desde consulta
- **WHEN** el usuario elige crear receta desde una consulta
- **THEN** el sistema navega a `/recetas/nueva?consulta_id=<consulta>&paciente_id=<paciente>`
