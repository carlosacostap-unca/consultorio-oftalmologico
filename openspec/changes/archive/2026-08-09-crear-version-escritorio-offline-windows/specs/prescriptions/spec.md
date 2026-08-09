## ADDED Requirements

### Requirement: Recetas offline
El sistema SHALL permitir crear, ver e imprimir recetas desde la base local sin conexión, manteniendo paciente, consulta opcional, médico y contenido indicado.

#### Scenario: Crear receta offline desde paciente
- **WHEN** un médico autenticado guarda una receta para un paciente local sin conexión
- **THEN** el sistema crea la receta con ID estable
- **AND** atribuye la receta al médico autenticado
- **AND** registra una operación pendiente durable

#### Scenario: Crear receta offline desde consulta
- **WHEN** una receta se crea desde una consulta local
- **THEN** conserva las relaciones con paciente y consulta
- **AND** la cola la envía después de confirmar sus dependencias

#### Scenario: Ver e imprimir receta pendiente
- **WHEN** el usuario abre una receta todavía no confirmada por el servidor
- **THEN** el sistema muestra e imprime los datos locales disponibles
- **AND** indica de forma discreta que el registro está pendiente de sincronización

### Requirement: Edición concurrente conservadora de receta
El sistema SHALL conservar la versión central cuando una receta fue editada central y localmente desde la misma base y SHALL crear un conflicto revisable.

#### Scenario: Receta central sin cambios
- **WHEN** la versión central coincide con la base de la edición local
- **THEN** el servidor aplica la edición y registra su auditoría

#### Scenario: Receta central modificada
- **WHEN** la versión central es posterior a la base de la edición local
- **THEN** el servidor no sobrescribe ninguna versión en silencio
- **AND** crea un conflicto con versión base, local y central

### Requirement: Baja lógica de receta
El sistema SHALL representar como baja lógica cualquier eliminación de receta dentro del dominio sincronizado.

#### Scenario: Eliminar receta sincronizable
- **WHEN** un usuario autorizado elimina una receta
- **THEN** el sistema la oculta de los listados normales
- **AND** conserva contenido, relaciones y auditoría hasta que la baja sea confirmada y según la política de retención
