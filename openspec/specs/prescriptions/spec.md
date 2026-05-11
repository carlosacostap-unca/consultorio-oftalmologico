# Prescriptions Specification

## Purpose
Define la gestion de recetas medicas y recetas de anteojos vinculadas opcionalmente a consultas.
## Requirements
### Requirement: Listado de recetas
El sistema SHALL listar recetas con paciente y consulta expandidos, filtros de paciente y fecha, y actualizacion en tiempo real.

#### Scenario: Cargar recetas
- **WHEN** el usuario abre `/recetas`
- **THEN** el sistema consulta `recetas` ordenadas por fecha descendente
- **AND** expande `paciente_id` y `consulta_id`

#### Scenario: Filtrar recetas
- **WHEN** el usuario ingresa paciente o fecha
- **THEN** el sistema filtra recetas visibles por nombre/apellido de paciente y por dia de receta

#### Scenario: Cambios en recetas
- **WHEN** PocketBase emite cambios en `recetas`
- **THEN** el sistema recarga el listado manteniendo fecha descendente

### Requirement: Crear receta
El sistema SHALL permitir crear recetas para un paciente, con consulta asociada opcional.

#### Scenario: Nueva receta libre
- **WHEN** el usuario abre `/recetas/nueva`
- **THEN** el sistema carga pacientes ordenados por apellido y nombre
- **AND** permite seleccionar paciente, fecha, medicamentos/anteojos e indicaciones

#### Scenario: Nueva receta desde consulta
- **WHEN** la URL incluye `consulta_id` y `paciente_id`
- **THEN** el formulario precarga ambos IDs
- **AND** carga las consultas del paciente para permitir confirmar o cambiar la asociacion

#### Scenario: Guardar receta
- **WHEN** el usuario completa paciente, fecha y medicamentos/anteojos
- **THEN** el sistema crea un registro en `recetas`
- **AND** guarda la fecha con hora `12:00:00.000Z`

### Requirement: Editar y ver receta
El sistema SHALL permitir ver o editar una receta existente.

#### Scenario: Ver receta
- **WHEN** la URL contiene `mode=view`
- **THEN** el sistema muestra paciente, fecha, consulta relacionada, medicamentos e indicaciones en modo lectura

#### Scenario: Editar receta
- **WHEN** el usuario guarda una receta existente
- **THEN** el sistema actualiza paciente, consulta opcional, fecha, medicamentos e indicaciones

#### Scenario: Consultas del paciente
- **WHEN** cambia el paciente seleccionado
- **THEN** el sistema recarga las consultas de ese paciente ordenadas por fecha descendente

### Requirement: Impresion de anteojos desde receta
El sistema SHALL ofrecer acceso a la impresion de anteojos cuando una receta esta vinculada a una consulta.

#### Scenario: Consulta relacionada seleccionada
- **WHEN** el formulario tiene `consulta_id`
- **THEN** el sistema muestra una accion para abrir `/consultas/[consulta_id]/imprimir-anteojos`

### Requirement: Eliminar receta
El sistema SHALL permitir eliminar recetas desde el listado previa confirmacion.

#### Scenario: Confirmar eliminacion
- **WHEN** el usuario confirma eliminar una receta
- **THEN** el sistema elimina el registro de `recetas`

### Requirement: Recetas reasignadas por fusion de pacientes
El sistema SHALL conservar las recetas al fusionar pacientes duplicados.

#### Scenario: Fusion reasigna recetas
- **WHEN** un paciente duplicado se fusiona con un paciente principal
- **THEN** el sistema actualiza las recetas del duplicado para apuntar al paciente principal
- **AND** las recetas siguen accesibles desde el paciente principal

#### Scenario: Receta vinculada a consulta reasignada
- **WHEN** una receta esta vinculada a una consulta tambien reasignada
- **THEN** el sistema conserva la relacion con la consulta
- **AND** actualiza el paciente de la receta al paciente principal

