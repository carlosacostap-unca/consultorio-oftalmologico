## MODIFIED Requirements

### Requirement: Datos oftalmologicos de consulta
El sistema SHALL registrar motivo, agudeza visual, presion ocular, refraccion, biomicroscopia, fondo de ojo, diagnostico y tratamiento con controles organizados para carga oftalmologica.

#### Scenario: Completar datos clinicos
- **WHEN** el usuario completa el formulario medico
- **THEN** el sistema conserva los campos de agudeza visual, PIO, refraccion de lejos y cerca, ADD, biomicroscopia, fondo de ojo, diagnostico y tratamiento
- **AND** agrupa esos campos por tipo de dato clinico para facilitar la carga

#### Scenario: Cargar AV y PIO por ojo
- **WHEN** el usuario carga agudeza visual o presion ocular
- **THEN** el sistema muestra controles equivalentes para OD y OI
- **AND** diferencia AV sin correccion, AV con correccion y PIO

#### Scenario: Cargar refraccion en grilla
- **WHEN** el usuario carga refraccion
- **THEN** el sistema muestra grillas separadas para lejos y cerca
- **AND** cada grilla organiza OD y OI con columnas ESF, CIL y EJE

#### Scenario: Calcular refraccion de cerca con ADD
- **WHEN** el usuario cambia el valor ADD
- **THEN** el sistema copia cilindro y eje de lejos a cerca
- **AND** suma ADD a la esfera de lejos para calcular esfera de cerca
