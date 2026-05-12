## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Impresion de receta medica
El sistema SHALL permitir imprimir una receta medica guardada.

#### Scenario: Abrir receta imprimible
- **WHEN** el usuario abre `/recetas/[id]/imprimir`
- **THEN** el sistema carga la receta con paciente expandido
- **AND** muestra paciente, fecha, medicamentos e indicaciones en formato imprimible

#### Scenario: Imprimir desde receta
- **WHEN** el usuario esta viendo una receta guardada
- **THEN** el sistema muestra una accion para abrir `/recetas/[id]/imprimir`
