## ADDED Requirements

### Requirement: Medico emisor de receta
El sistema SHALL guardar, expandir, mostrar e imprimir el medico que emite cada receta.

#### Scenario: Receta desde consulta
- **WHEN** se crea una receta vinculada a una consulta con `medico_id`
- **THEN** la receta precarga ese medico como emisor
- **AND** guarda el valor en `recetas.medico_id`

#### Scenario: Receta libre
- **WHEN** se crea una receta sin consulta vinculada
- **THEN** el formulario determina el medico desde el usuario medico activo o permite seleccionarlo
- **AND** el sistema exige medico emisor antes de guardar cuando no exista contexto automatico

#### Scenario: Ver o imprimir receta
- **WHEN** el usuario ve o imprime una receta
- **THEN** el sistema muestra el medico emisor cuando exista
- **AND** muestra "Medico no registrado" cuando sea una receta historica sin atribucion

#### Scenario: Cambiar consulta vinculada
- **WHEN** el usuario selecciona o cambia la consulta vinculada de una receta
- **THEN** el sistema sugiere el medico responsable de esa consulta como medico emisor
- **AND** no sobrescribe una seleccion manual sin una accion explicita del usuario
