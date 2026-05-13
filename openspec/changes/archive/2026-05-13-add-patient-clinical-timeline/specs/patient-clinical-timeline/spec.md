## ADDED Requirements

### Requirement: Linea de tiempo clinica del paciente
El sistema SHALL mostrar una historia clinica unificada en la ficha de lectura del paciente, combinando consultas y recetas recientes en orden cronologico descendente.

#### Scenario: Paciente con consultas y recetas
- **WHEN** el usuario abre `/pacientes/[id]?mode=view` y el paciente tiene consultas y recetas registradas
- **THEN** el sistema muestra una seccion de historia clinica con eventos de consulta y receta ordenados por fecha descendente
- **AND** cada evento muestra tipo, fecha y resumen clinico
- **AND** cada evento permite abrir el registro asociado

#### Scenario: Receta vinculada a consulta
- **WHEN** una receta de la historia clinica esta vinculada a una consulta
- **THEN** el sistema muestra la vinculacion
- **AND** permite abrir la consulta asociada

#### Scenario: Paciente sin eventos clinicos
- **WHEN** el usuario abre la ficha de un paciente sin consultas ni recetas
- **THEN** el sistema informa que no hay eventos clinicos recientes para mostrar
