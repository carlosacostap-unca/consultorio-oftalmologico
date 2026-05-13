## Modified Requirements

### Requirement: Listado de recetas
El sistema SHALL listar recetas con paciente y consulta expandidos, filtros operativos y actualizacion en tiempo real.

#### Scenario: Cargar recetas
- **WHEN** el usuario abre `/recetas`
- **THEN** el sistema consulta `recetas` ordenadas por fecha descendente
- **AND** expande `paciente_id` y `consulta_id`
- **AND** muestra por cada receta la fecha, paciente, documento, medicamento resumido y estado de vinculacion con consulta

#### Scenario: Filtrar recetas
- **WHEN** el usuario ingresa texto de busqueda
- **THEN** el sistema filtra recetas visibles por nombre, apellido, documento, ficha, medicamento o indicacion
- **WHEN** el usuario ingresa fecha
- **THEN** el sistema filtra recetas visibles por dia de receta
- **WHEN** el usuario selecciona vinculacion
- **THEN** el sistema filtra recetas vinculadas a consulta o recetas libres segun corresponda

#### Scenario: Acciones rapidas de recetas
- **WHEN** una receta se muestra en el listado
- **THEN** el sistema permite ver, imprimir y editar la receta
- **AND** permite abrir el paciente relacionado
- **AND** permite volver a la consulta vinculada cuando exista

#### Scenario: Cambios en recetas
- **WHEN** PocketBase emite cambios en `recetas`
- **THEN** el sistema recarga el listado manteniendo fecha descendente
