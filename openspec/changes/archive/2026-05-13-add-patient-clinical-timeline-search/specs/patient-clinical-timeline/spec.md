## MODIFIED Requirements

### Requirement: Linea de tiempo clinica del paciente
El sistema SHALL mostrar una historia clinica unificada en la ficha de lectura del paciente, combinando consultas y recetas recientes en orden cronologico descendente, y SHALL permitir filtrar y buscar los eventos.

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

#### Scenario: Buscar eventos clinicos
- **WHEN** el usuario escribe texto en el buscador de historia clinica
- **THEN** el sistema muestra solamente eventos que coinciden con el texto buscado
- **AND** busca en tipo, fecha, motivo, diagnostico, tratamiento, medicamentos, indicaciones y vinculacion cuando existan
- **AND** conserva el filtro de tipo seleccionado

#### Scenario: Limpiar busqueda
- **WHEN** el usuario limpia el buscador de historia clinica
- **THEN** el sistema vuelve a mostrar los eventos correspondientes al filtro seleccionado

#### Scenario: Receta vinculada a consulta
- **WHEN** una receta de la historia clinica esta vinculada a una consulta
- **THEN** el sistema muestra la vinculacion
- **AND** permite abrir la consulta asociada

#### Scenario: Paciente sin eventos clinicos
- **WHEN** el usuario abre la ficha de un paciente sin consultas ni recetas
- **THEN** el sistema informa que no hay eventos clinicos recientes para mostrar

#### Scenario: Filtro o busqueda sin eventos
- **WHEN** el filtro seleccionado o la busqueda no tienen eventos disponibles
- **THEN** el sistema informa que no hay eventos para ese criterio
