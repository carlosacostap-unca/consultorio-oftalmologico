## ADDED Requirements

### Requirement: Importacion segura de consultas DBF
El sistema SHALL importar consultas historicas desde `DATOMED.DBF` solo con relaciones de paciente confiables.

#### Scenario: Consulta con ficha unica
- **WHEN** una consulta legacy tiene `NUM_FICH` que coincide con un paciente legacy unico o consolidado
- **THEN** el sistema crea la consulta asociada a ese paciente
- **AND** conserva `numero_ficha` en el registro de consulta

#### Scenario: Consulta con ficha ambigua
- **WHEN** una consulta legacy tiene `NUM_FICH` clasificado como ambiguo
- **THEN** el sistema no asigna automaticamente `paciente_id`
- **AND** reporta la consulta para revision manual o la importa como huerfana segun configuracion

#### Scenario: Consulta sin paciente en DBF
- **WHEN** una consulta legacy tiene `NUM_FICH` que no existe en `PACIENTE.DBF`
- **THEN** el sistema la reporta como huerfana
- **AND** conserva ficha, fecha y datos clinicos en el reporte o en una consulta sin `paciente_id` segun configuracion

### Requirement: Mapeo clinico de DATOMED
El sistema SHALL mapear los campos oftalmologicos de `DATOMED.DBF` a los campos de `consultas`.

#### Scenario: Mapear datos oftalmologicos
- **WHEN** el importador procesa una fila de `DATOMED.DBF`
- **THEN** mapea fecha, motivo, agudeza visual, refraccion, presion ocular, fondo de ojo, tratamiento y diagnostico
- **AND** conserva vacios los campos sin valor legacy

#### Scenario: Consultas historicas sin medico
- **WHEN** el importador crea consultas desde DBF
- **THEN** no infiere `medico_id`
- **AND** deja la atribucion medica vacia salvo que una regla explicita aprobada indique lo contrario
