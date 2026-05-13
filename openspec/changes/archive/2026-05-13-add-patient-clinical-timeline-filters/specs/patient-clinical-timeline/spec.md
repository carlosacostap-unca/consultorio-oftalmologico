## MODIFIED Requirements

### Requirement: Linea de tiempo clinica del paciente
El sistema SHALL mostrar una historia clinica unificada en la ficha de lectura del paciente, combinando consultas y recetas recientes en orden cronologico descendente, y SHALL permitir filtrar los eventos por tipo.

#### Scenario: Paciente con consultas y recetas
- **WHEN** el usuario abre `/pacientes/[id]?mode=view` y el paciente tiene consultas y recetas registradas
- **THEN** el sistema muestra una seccion de historia clinica con eventos de consulta y receta ordenados por fecha descendente
- **AND** cada evento muestra tipo, fecha y resumen clinico
- **AND** cada evento permite abrir el registro asociado

#### Scenario: Filtrar eventos clinicos
- **WHEN** el usuario selecciona Todo, Consultas o Recetas en la historia clinica
- **THEN** el sistema muestra solamente los eventos correspondientes al filtro seleccionado
- **AND** mantiene el orden por fecha descendente
- **AND** muestra el contador de eventos de cada filtro

#### Scenario: Receta vinculada a consulta
- **WHEN** una receta de la historia clinica esta vinculada a una consulta
- **THEN** el sistema muestra la vinculacion
- **AND** permite abrir la consulta asociada

#### Scenario: Paciente sin eventos clinicos
- **WHEN** el usuario abre la ficha de un paciente sin consultas ni recetas
- **THEN** el sistema informa que no hay eventos clinicos recientes para mostrar

#### Scenario: Filtro sin eventos
- **WHEN** el usuario selecciona un filtro que no tiene eventos disponibles
- **THEN** el sistema informa que no hay eventos para ese filtro
