## MODIFIED Requirements

### Requirement: Baja lógica sincronizable de paciente
El sistema SHALL representar como baja lógica cualquier eliminación de paciente dentro del dominio sincronizado, SHALL evitar conflictos causados sólo por metadatos técnicos y SHALL mantener oculto el paciente cuando la baja sea confirmada.

#### Scenario: Eliminar paciente desde escritorio
- **WHEN** un usuario autorizado confirma la eliminación
- **THEN** el sistema oculta el paciente de los flujos normales
- **AND** registra una baja lógica pendiente sin borrar consultas, recetas ni evidencia de auditoría

#### Scenario: Eliminar paciente recién sincronizado
- **WHEN** un paciente creado offline ya recibió confirmación y ficha definitiva central
- **AND** el usuario autorizado lo elimina sin que existan cambios funcionales concurrentes
- **THEN** la baja se sincroniza sin conflicto por diferencias entre timestamps locales y centrales
- **AND** el paciente permanece oculto local y centralmente

#### Scenario: Baja rechazada o conflictiva
- **WHEN** el servidor no acepta la baja por relaciones o cambios funcionales concurrentes
- **THEN** la base local conserva el registro y presenta el conflicto
- **AND** no pierde su historial clínico

#### Scenario: Cancelar la baja del paciente
- **WHEN** el usuario autorizado resuelve un conflicto de baja conservando la versión central
- **THEN** el paciente vuelve a quedar activo en la PC
- **AND** la resolución queda auditada

#### Scenario: Confirmar la baja del paciente
- **WHEN** el usuario autorizado resuelve un conflicto de baja aplicando la intención local
- **THEN** el servidor marca el paciente como eliminado lógicamente
- **AND** el paciente deja de aparecer en los listados activos después de sincronizar
- **AND** la resolución queda auditada
