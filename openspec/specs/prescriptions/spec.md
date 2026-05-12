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
El sistema SHALL permitir crear recetas para un paciente, con consulta asociada opcional, preservando el contexto clinico cuando la receta nace desde una consulta y sin cargar todo el padron de pacientes.

#### Scenario: Nueva receta libre
- **WHEN** el usuario abre `/recetas/nueva`
- **THEN** el sistema permite buscar pacientes por apellido, nombre, documento o ficha
- **AND** lista resultados paginados sin cargar todo el padron
- **AND** permite seleccionar paciente, fecha, medicamentos/anteojos e indicaciones

#### Scenario: Nueva receta desde consulta
- **WHEN** la URL incluye `consulta_id` y `paciente_id`
- **THEN** el formulario precarga ambos IDs
- **AND** carga puntualmente el paciente seleccionado
- **AND** carga las consultas del paciente para permitir confirmar o cambiar la asociacion
- **AND** muestra contexto del paciente y de la consulta vinculada

#### Scenario: Guardar receta
- **WHEN** el usuario completa paciente, fecha y medicamentos/anteojos
- **THEN** el sistema crea un registro en `recetas`
- **AND** guarda la fecha con hora `12:00:00.000Z`
- **AND** muestra una confirmacion de receta guardada sin redirigir automaticamente

#### Scenario: Acciones posteriores al guardado
- **WHEN** la receta se guarda correctamente
- **THEN** el sistema permite abrir la receta creada
- **AND** permite volver a la consulta vinculada cuando existe
- **AND** permite imprimir anteojos cuando existe consulta vinculada
- **AND** permite cargar otra receta para el mismo paciente

### Requirement: Editar y ver receta
El sistema SHALL permitir ver o editar una receta existente sin cargar todo el padron de pacientes y con acciones clinicas de continuidad.

#### Scenario: Ver receta
- **WHEN** la URL contiene `mode=view`
- **THEN** el sistema carga puntualmente el paciente de la receta
- **AND** muestra paciente, fecha, consulta relacionada, medicamentos e indicaciones en modo lectura
- **AND** muestra acciones para imprimir receta medica, abrir el paciente y volver a la consulta vinculada cuando exista

#### Scenario: Editar receta
- **WHEN** el usuario edita una receta existente
- **THEN** el sistema permite buscar pacientes por apellido, nombre, documento o ficha
- **AND** actualiza paciente, consulta opcional, fecha, medicamentos e indicaciones

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

### Requirement: Impresion de receta medica
El sistema SHALL permitir imprimir una receta medica guardada.

#### Scenario: Abrir receta imprimible
- **WHEN** el usuario abre `/recetas/[id]/imprimir`
- **THEN** el sistema carga la receta con paciente expandido
- **AND** muestra paciente, fecha, medicamentos e indicaciones en formato imprimible

#### Scenario: Imprimir desde receta
- **WHEN** el usuario esta viendo una receta guardada
- **THEN** el sistema muestra una accion para abrir `/recetas/[id]/imprimir`

