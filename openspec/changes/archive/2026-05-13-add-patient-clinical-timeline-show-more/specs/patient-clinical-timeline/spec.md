## MODIFIED Requirements

### Requirement: Linea de tiempo clinica del paciente
El sistema SHALL mostrar una historia clinica unificada en la ficha de lectura del paciente, combinando consultas y recetas recientes en orden cronologico descendente, y SHALL permitir filtrar, buscar, accionar, desplegar detalle y controlar la cantidad de eventos visibles.

#### Scenario: Paciente con consultas y recetas
- **WHEN** el usuario abre `/pacientes/[id]?mode=view` y el paciente tiene consultas y recetas registradas
- **THEN** el sistema muestra una seccion de historia clinica con eventos de consulta y receta ordenados por fecha descendente
- **AND** cada evento muestra tipo, fecha y resumen clinico
- **AND** cada evento permite abrir el registro asociado

#### Scenario: Mostrar mas eventos
- **WHEN** existen mas eventos que el limite inicial de la historia clinica
- **THEN** el sistema muestra una accion para ver mas eventos
- **AND** al activar esa accion muestra todos los eventos que coinciden con el filtro y busqueda actuales
- **AND** permite volver al resumen inicial

#### Scenario: Desplegar detalle de consulta
- **WHEN** el usuario despliega un evento de consulta
- **THEN** el sistema muestra fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** permite contraer el detalle del evento

#### Scenario: Desplegar detalle de receta
- **WHEN** el usuario despliega un evento de receta
- **THEN** el sistema muestra fecha, medicamentos, indicaciones y vinculacion a consulta cuando existan
- **AND** permite contraer el detalle del evento

#### Scenario: Acciones de consulta
- **WHEN** un evento de historia clinica corresponde a una consulta
- **THEN** el sistema permite abrir la consulta
- **AND** permite imprimir la consulta
- **AND** permite crear una nueva receta vinculada a esa consulta

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
