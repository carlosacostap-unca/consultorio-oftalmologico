## ADDED Requirements

### Requirement: Gestión local de pacientes
El sistema SHALL permitir listar, buscar, crear, ver y editar pacientes desde la base local cuando la aplicación de escritorio no tenga conexión.

#### Scenario: Consultar pacientes offline
- **WHEN** un usuario autenticado abre `/pacientes` sin conexión
- **THEN** el sistema lista y busca sobre la copia local
- **AND** omite registros fusionados o eliminados lógicamente de la vista normal
- **AND** identifica registros con cambios pendientes o conflicto

#### Scenario: Crear paciente offline
- **WHEN** el usuario completa un alta válida sin conexión
- **THEN** el sistema guarda el paciente localmente con ID estable y ficha provisoria
- **AND** registra la operación pendiente atribuida al usuario y equipo
- **AND** permite continuar hacia una nueva consulta para ese paciente

#### Scenario: Editar paciente offline
- **WHEN** el usuario guarda cambios sobre un paciente descargado
- **THEN** el sistema actualiza la copia local inmediatamente
- **AND** conserva la versión base y los campos modificados para detectar conflictos al sincronizar

### Requirement: Validaciones locales y revisión central de paciente
El sistema SHALL ejecutar validaciones posibles con la copia local y SHALL someter las decisiones globales de ficha, documento y duplicidad a confirmación central.

#### Scenario: Duplicado ya presente localmente
- **WHEN** el documento o ficha ingresados coinciden con un paciente activo de la copia local
- **THEN** el sistema muestra la coincidencia
- **AND** aplica las mismas reglas de bloqueo o advertencia del flujo web

#### Scenario: Coincidencia existente sólo en el servidor
- **WHEN** el paciente pasa validaciones locales pero coincide con un registro central más reciente
- **THEN** el servidor no consolida silenciosamente el alta o edición
- **AND** devuelve un conflicto de paciente para revisión

### Requirement: Ficha provisoria visible
El sistema SHALL distinguir una ficha provisoria de una definitiva en todos los flujos locales del paciente.

#### Scenario: Ver paciente todavía pendiente
- **WHEN** un paciente conserva una ficha `TEMP-<EQUIPO>-<SECUENCIA>`
- **THEN** listado, detalle, consulta y receta muestran que la ficha es provisoria
- **AND** las impresiones no la presentan como ficha definitiva

#### Scenario: Recibir ficha definitiva
- **WHEN** la sincronización devuelve la ficha asignada por el servidor
- **THEN** el paciente local conserva su mismo ID
- **AND** todas las vistas posteriores muestran la ficha definitiva sin intervención manual

### Requirement: Baja lógica sincronizable de paciente
El sistema SHALL representar como baja lógica cualquier eliminación de paciente dentro del dominio sincronizado.

#### Scenario: Eliminar paciente desde escritorio
- **WHEN** un usuario autorizado confirma la eliminación
- **THEN** el sistema oculta el paciente de los flujos normales
- **AND** registra una baja lógica pendiente sin borrar consultas, recetas ni evidencia de auditoría

#### Scenario: Baja rechazada o conflictiva
- **WHEN** el servidor no acepta la baja por relaciones o cambios concurrentes
- **THEN** la base local conserva el registro y presenta el conflicto
- **AND** no pierde su historial clínico
