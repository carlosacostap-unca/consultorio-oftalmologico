## ADDED Requirements

### Requirement: Advertencia de posibles pacientes duplicados
El sistema SHALL advertir posibles pacientes duplicados cuando un usuario crea o corrige datos administrativos de un paciente.

#### Scenario: Coincidencia exacta de documento, telefono o ficha
- **WHEN** el usuario ingresa un documento, telefono o numero de ficha que coincide con otro paciente
- **THEN** el sistema muestra una advertencia de posible duplicado
- **AND** muestra paciente, documento, telefono, ficha y obra social cuando existan

#### Scenario: Coincidencia por nombre parecido
- **WHEN** el usuario ingresa apellido y nombre similares a otro paciente
- **THEN** el sistema muestra la coincidencia como posible duplicado
- **AND** no bloquea el guardado solo por similitud

#### Scenario: Excluir paciente actual
- **WHEN** el usuario edita un paciente existente desde un contexto operativo
- **THEN** el sistema no muestra al propio paciente como duplicado

### Requirement: Advertencias no destructivas
El sistema SHALL tratar las advertencias de duplicados como informacion operativa y no como fusion automatica.

#### Scenario: Continuar luego de revisar
- **WHEN** el usuario revisa una advertencia de posible duplicado
- **THEN** el sistema permite continuar con el flujo actual
- **AND** no modifica ni fusiona otros pacientes
