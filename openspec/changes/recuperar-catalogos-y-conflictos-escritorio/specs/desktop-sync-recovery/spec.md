## ADDED Requirements

### Requirement: Catálogo disponible antes de datos clínicos
El cliente SHALL actualizar mutuales antes de aplicar datos clínicos centrales y SHALL conservar registros y relaciones existentes.

#### Scenario: Mutual creada después de activar Windows
- **WHEN** un paciente central referencia una mutual ausente localmente
- **THEN** la sincronización descarga la mutual y luego el paciente con su relación intacta
- **AND** no genera operaciones locales por esas descargas ni elimina otras mutuales

#### Scenario: Fallo de catálogo
- **WHEN** falla la descarga o persistencia de mutuales
- **THEN** conserva los cursores clínicos y todas las operaciones para reintentar

### Requirement: Recuperación de resolución explícita durable
El sistema SHALL recuperar sólo conflictos ya resueltos con confirmación central verificable y SHALL conservar sus snapshots y payloads originales.

#### Scenario: Resolución revisada fuera de la PC
- **WHEN** conflicto y ledger pertenecen al equipo y actor autenticados y la operación está confirmada
- **THEN** aplica la versión central actual y confirma la operación antes de cerrar el conflicto local
- **AND** no reescribe datos clínicos centrales

#### Scenario: Decisión pendiente o ledger inconsistente
- **WHEN** el conflicto sigue abierto o la confirmación no coincide en operación, entidad y registro
- **THEN** no aplica ninguna resolución automáticamente

#### Scenario: Edición local adicional o escritura fallida
- **WHEN** otra operación local protege el registro o falla la persistencia
- **THEN** conserva la edición local y el conflicto abierto y permite reintentar

#### Scenario: Acceso ajeno
- **WHEN** otro actor o dispositivo solicita la resolución
- **THEN** rechaza la solicitud sin devolver datos clínicos

#### Scenario: Respuesta perdida
- **WHEN** la PC pierde la respuesta o se interrumpe el cierre local
- **THEN** recupera la misma decisión sin duplicar operaciones ni borrar evidencia

### Requirement: Revisión central vigente al decidir
El servidor SHALL evitar que conservar central propague un snapshot obsoleto.

#### Scenario: Central cambió después de la revisión
- **WHEN** se solicita conservar central y la revisión actual difiere del snapshot del conflicto
- **THEN** rechaza la decisión antigua sin modificar datos clínicos ni cerrar el conflicto
