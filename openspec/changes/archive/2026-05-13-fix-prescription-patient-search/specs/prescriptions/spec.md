## Modified Requirements

### Requirement: Crear receta
El sistema SHALL permitir crear recetas para un paciente, con consulta asociada opcional, preservando el contexto clinico cuando la receta nace desde una consulta y sin cargar todo el padron de pacientes ni enviar filtros invalidos a PocketBase.

#### Scenario: Nueva receta libre
- **WHEN** el usuario abre `/recetas/nueva`
- **THEN** el sistema permite buscar pacientes por apellido, nombre, documento o ficha
- **AND** lista resultados paginados sin cargar todo el padron
- **AND** no usa campos inexistentes del esquema PocketBase para construir el filtro remoto
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
El sistema SHALL permitir ver o editar una receta existente sin cargar todo el padron de pacientes, sin enviar filtros invalidos a PocketBase y con acciones clinicas de continuidad.

#### Scenario: Ver receta
- **WHEN** la URL contiene `mode=view`
- **THEN** el sistema carga puntualmente el paciente de la receta
- **AND** muestra paciente, fecha, consulta relacionada, medicamentos e indicaciones en modo lectura
- **AND** muestra acciones para imprimir receta medica, abrir el paciente y volver a la consulta vinculada cuando exista

#### Scenario: Editar receta
- **WHEN** el usuario edita una receta existente
- **THEN** el sistema permite buscar pacientes por apellido, nombre, documento o ficha
- **AND** no usa campos inexistentes del esquema PocketBase para construir el filtro remoto
- **AND** actualiza paciente, consulta opcional, fecha, medicamentos e indicaciones

#### Scenario: Consultas del paciente
- **WHEN** cambia el paciente seleccionado
- **THEN** el sistema recarga las consultas de ese paciente ordenadas por fecha descendente
