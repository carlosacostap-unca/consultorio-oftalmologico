## ADDED Requirements

### Requirement: Documento unico en pacientes activos
El sistema SHALL impedir que dos pacientes activos tengan el mismo DNI o numero de documento.

#### Scenario: Alta con documento duplicado
- **WHEN** el usuario intenta crear un paciente con un DNI ya asignado a otro paciente activo
- **THEN** el sistema informa a que paciente y ficha pertenece el DNI
- **AND** no crea el registro

#### Scenario: Edicion con documento duplicado
- **WHEN** el usuario intenta editar un paciente y guardar un DNI ya asignado a otro paciente activo
- **THEN** el sistema informa a que paciente y ficha pertenece el DNI
- **AND** no actualiza el registro

#### Scenario: Compatibilidad con campo historico dni
- **WHEN** existen registros activos con el documento en `dni` o en `numero_documento`
- **THEN** la validacion busca coincidencias en ambos campos
- **AND** excluye al paciente actual cuando se edita una ficha existente
