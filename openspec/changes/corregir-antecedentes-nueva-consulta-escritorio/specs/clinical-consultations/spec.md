## MODIFIED Requirements

### Requirement: Antecedentes clinicos
El sistema SHALL registrar antecedentes fijos, precargarlos de forma estable combinando la ficha confirmada del paciente con la consulta anterior cuando exista y presentarlos de forma estable al revisar una consulta existente.

#### Scenario: Antecedentes del paciente
- **WHEN** el paciente seleccionado tiene antecedentes fijos o una observacion en `Otra`
- **THEN** el formulario de consulta los precarga desde `pacientes`
- **AND** muestra los chips correspondientes activos y conserva la observacion libre
- **AND** una respuesta asincronica posterior no los desmarca ni los reemplaza con valores vacios

#### Scenario: Paciente preseleccionado desde su ficha
- **WHEN** el medico inicia una nueva consulta desde la ficha de un paciente con antecedentes
- **THEN** el sistema espera la carga de esa ficha antes de decidir si necesita respaldo historico
- **AND** mantiene visibles sus antecedentes una vez cargados

#### Scenario: Respaldo desde ultima consulta
- **WHEN** la ficha confirmada del paciente no tiene antecedentes fijos ni observacion libre
- **THEN** el sistema intenta cargar antecedentes desde la ultima consulta del paciente

#### Scenario: Antecedentes repartidos entre ficha y consulta anterior
- **WHEN** la ficha confirmada contiene al menos un antecedente y la ultima consulta contiene otros antecedentes activos
- **THEN** el sistema mantiene activos los chips provenientes de ambas fuentes
- **AND** conserva `Otra` desde la consulta anterior cuando no esta vacia, usando la ficha como respaldo

#### Scenario: Consultas importadas fuera de orden cronologico
- **WHEN** una consulta de fecha clinica anterior fue creada o importada despues de la ultima atencion
- **THEN** la precarga selecciona la ultima consulta por `fecha` descendente y `created` descendente como desempate
- **AND** los antecedentes coinciden con la ultima consulta del historial visible, combinados con la ficha

#### Scenario: Respuesta obsoleta durante un cambio de paciente
- **WHEN** una solicitud de antecedentes historicos continua en curso y el usuario selecciona otro paciente
- **THEN** el sistema ignora la respuesta correspondiente al paciente anterior
- **AND** conserva los antecedentes del paciente actualmente seleccionado

#### Scenario: Revisar una consulta de un paciente con enfermedad de base
- **WHEN** el medico abre una consulta existente cuyo paciente tiene un antecedente fijo activo, aunque la consulta no lo tenga registrado
- **THEN** el sistema mantiene activo el chip correspondiente durante la revision
- **AND** una carga asincrona posterior no lo desmarca ni reemplaza con datos de otra consulta
