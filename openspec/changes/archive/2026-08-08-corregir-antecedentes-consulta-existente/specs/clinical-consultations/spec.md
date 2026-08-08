## MODIFIED Requirements

### Requirement: Antecedentes clinicos
El sistema SHALL registrar antecedentes fijos, copiarlos desde el paciente o la consulta anterior cuando corresponda y presentarlos de forma estable al revisar una consulta existente.

#### Scenario: Antecedentes del paciente
- **WHEN** el paciente seleccionado tiene antecedentes fijos
- **THEN** el formulario de consulta los precarga desde `pacientes`
- **AND** muestra un resumen de antecedentes activos

#### Scenario: Respaldo desde ultima consulta
- **WHEN** el paciente no tiene antecedentes fijos cargados
- **THEN** el sistema intenta cargar antecedentes desde la ultima consulta del paciente

#### Scenario: Revisar una consulta de un paciente con enfermedad de base
- **WHEN** el medico abre una consulta existente cuyo paciente tiene un antecedente fijo activo, aunque la consulta no lo tenga registrado
- **THEN** el sistema mantiene activo el chip correspondiente durante la revision
- **AND** una carga asincrona posterior no lo desmarca ni reemplaza con datos de otra consulta
