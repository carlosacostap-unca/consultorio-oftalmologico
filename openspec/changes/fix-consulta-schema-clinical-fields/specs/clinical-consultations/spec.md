## MODIFIED Requirements

### Requirement: Datos oftalmologicos de consulta
El sistema SHALL registrar motivo, agudeza visual, presion ocular, refraccion, biomicroscopia, fondo de ojo, diagnostico y tratamiento con controles organizados para carga oftalmologica.

#### Scenario: Completar datos clinicos
- **WHEN** el usuario completa el formulario medico
- **THEN** el sistema conserva los campos de agudeza visual, PIO, refraccion de lejos y cerca, ADD, biomicroscopia, fondo de ojo, diagnostico y tratamiento
- **AND** agrupa esos campos por tipo de dato clinico para facilitar la carga
- **AND** el esquema operativo de `consultas` acepta los campos persistidos por el formulario clinico

#### Scenario: Error de esquema al guardar
- **WHEN** PocketBase rechaza el alta de consulta por campos faltantes o validacion de esquema
- **THEN** el sistema informa una causa accionable para corregir el esquema o los datos enviados
