## ADDED Requirements

### Requirement: Consolidacion segura de pacientes legacy por ficha
El sistema SHALL clasificar pacientes legacy con `NUM_FICH` duplicado antes de asociar consultas historicas.

#### Scenario: Ficha duplicada consolidable
- **WHEN** varios registros de `PACIENTE.DBF` comparten `NUM_FICH` y representan la misma identidad normalizada
- **THEN** el sistema los trata como candidatos a un unico paciente consolidado
- **AND** conserva los mejores datos administrativos disponibles para la ficha

#### Scenario: Ficha duplicada ambigua
- **WHEN** varios registros de `PACIENTE.DBF` comparten `NUM_FICH` pero representan identidades distintas
- **THEN** el sistema reporta la ficha como ambigua
- **AND** no asigna automaticamente a un paciente las consultas de esa ficha

### Requirement: Cobertura legacy no identificada
El sistema SHALL conservar la informacion de cobertura legacy aunque el codigo de mutual no tenga coincidencia confiable.

#### Scenario: Codigo de mutual sin coincidencia
- **WHEN** `PACIENTE.DBF.COD_MUTU` no coincide con una mutual importada
- **THEN** el sistema asigna una cobertura administrativa de legacy no identificado o deja la relacion vacia segun configuracion
- **AND** reporta la ficha y el codigo original para revision

#### Scenario: Codigo legacy sin cobertura real
- **WHEN** el codigo de mutual legacy representa ausencia de cobertura informada
- **THEN** el sistema usa una mutual administrativa de sin cobertura informada o deja la relacion vacia segun configuracion
- **AND** no lo convierte automaticamente en una mutual real distinta

### Requirement: Diagnostico legacy de paciente
El sistema SHALL conservar `PACIENTE.DBF.DIAGNO` como dato clinico historico sin mezclarlo con antecedentes administrativos.

#### Scenario: Paciente con diagnostico legacy
- **WHEN** un paciente legacy tiene `DIAGNO`
- **THEN** el sistema prepara un registro clinico historico reconocible para ese diagnostico
- **AND** usa `PRESUNTIVO` como fecha cuando existe y es valida

#### Scenario: Antecedentes administrativos
- **WHEN** el sistema importa antecedentes desde `PACIENTE.DBF`
- **THEN** mapea alergia, asma, reuma, gota, herpes y diabetes a los campos de antecedentes correspondientes
- **AND** no guarda `DIAGNO` dentro de `ant_otra`
