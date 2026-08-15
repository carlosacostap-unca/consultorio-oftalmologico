## MODIFIED Requirements

### Requirement: Datos oftalmologicos de consulta
El sistema SHALL registrar motivo, agudeza visual, presion ocular, refraccion, biomicroscopia, fondo de ojo, diagnostico y tratamiento con controles organizados para carga oftalmologica.

#### Scenario: Mostrar medico responsable de otra consulta
- **WHEN** un medico visualiza una consulta asignada a otro medico
- **THEN** el sistema muestra el nombre del medico responsable
- **AND** no depende exclusivamente de `expand=medico_id` desde PocketBase cliente

#### Scenario: Mostrar medico responsable al crear consulta
- **WHEN** un usuario con rol medico abre una nueva consulta
- **THEN** el sistema muestra el nombre del medico responsable usando el usuario autenticado
- **AND** la consulta se guarda con ese `medico_id`

#### Scenario: Rechazar creacion por usuario no responsable
- **WHEN** un usuario intenta crear una consulta con rol activo distinto de medico
- **OR** intenta asignar un `medico_id` distinto del usuario autenticado
- **THEN** el sistema rechaza la creacion
