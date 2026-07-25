## ADDED Requirements

### Requirement: Consultas clínicas offline
El sistema SHALL permitir crear, ver e imprimir consultas desde la base local sin conexión, manteniendo paciente, médico, fecha clínica y campos oftalmológicos.

#### Scenario: Crear consulta offline
- **WHEN** un médico autenticado guarda una consulta para un paciente local sin conexión
- **THEN** el sistema crea la consulta con ID estable y relación al paciente
- **AND** atribuye `medico_id` al médico autenticado
- **AND** registra una operación pendiente durable

#### Scenario: Consultar historial offline
- **WHEN** un usuario abre el listado, detalle o historia clínica sin conexión
- **THEN** el sistema obtiene las consultas disponibles en la copia local
- **AND** muestra su estado de sincronización sin ocultar contenido clínico guardado

#### Scenario: Imprimir consulta offline
- **WHEN** el usuario abre la vista imprimible de una consulta local
- **THEN** el sistema genera la hoja con los datos locales disponibles
- **AND** indica de forma discreta si el registro todavía está pendiente de confirmación central

### Requirement: Edición offline protegida de consulta
El sistema SHALL conservar los límites de edición clínica también offline y SHALL tratar toda edición concurrente como conflicto conservador.

#### Scenario: Consulta editable en la copia local
- **WHEN** la fecha clínica está dentro del límite almacenado y el rol activo permite editar
- **THEN** el sistema permite guardar localmente
- **AND** conserva la versión base completa para sincronización

#### Scenario: Consulta fuera de límite
- **WHEN** la consulta está fuera del límite de edición disponible
- **THEN** el formulario permanece en modo lectura aun sin conexión

#### Scenario: Cambio central concurrente
- **WHEN** el servidor recibió cambios sobre la consulta después de la versión base local
- **THEN** no sobrescribe la versión central con la edición offline
- **AND** presenta ambas versiones como conflicto clínico auditable

### Requirement: Dependencias locales de consulta
El sistema SHALL impedir que una consulta se sincronice antes que el paciente local del que depende.

#### Scenario: Paciente y consulta creados offline
- **WHEN** una consulta referencia un paciente todavía pendiente
- **THEN** la cola mantiene la consulta detrás del alta de paciente
- **AND** usa el mismo ID de paciente después de la confirmación central

### Requirement: Baja lógica de consulta
El sistema SHALL conservar el historial y representar cualquier eliminación sincronizada de consulta como baja lógica auditable.

#### Scenario: Consulta marcada para eliminación
- **WHEN** una acción autorizada elimina una consulta dentro del flujo sincronizado
- **THEN** el sistema no purga físicamente el contenido clínico
- **AND** registra actor, equipo, fecha y operación pendiente o confirmada
