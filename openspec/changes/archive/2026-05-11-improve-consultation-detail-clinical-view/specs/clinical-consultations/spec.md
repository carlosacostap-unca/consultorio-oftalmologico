## MODIFIED Requirements

### Requirement: Navegacion clinica entre consultas
El sistema SHALL permitir navegar dentro del historial de consultas del mismo paciente y revisar una consulta existente con contexto clinico resumido.

#### Scenario: Consultas relacionadas del paciente
- **WHEN** se abre una consulta existente
- **THEN** el sistema carga las consultas del mismo paciente ordenadas por fecha y creacion
- **AND** identifica primera, anterior y posterior respecto de la consulta actual

#### Scenario: Resumen de consulta existente
- **WHEN** se abre una consulta existente
- **THEN** el sistema muestra una cabecera con paciente, fecha, edad, ficha y obra social cuando esten disponibles
- **AND** muestra un resumen clinico con motivo, diagnostico, tratamiento, PIO, AV, refraccion y antecedentes activos

#### Scenario: Acciones clinicas desde detalle
- **WHEN** se abre una consulta existente
- **THEN** el sistema permite crear receta vinculada a la consulta y al paciente
- **AND** permite imprimir anteojos desde la consulta
- **AND** permite abrir el paciente y crear una nueva consulta para el mismo paciente
