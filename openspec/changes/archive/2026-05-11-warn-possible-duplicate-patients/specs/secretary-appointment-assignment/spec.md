## ADDED Requirements

### Requirement: Duplicados visibles en Gestion de Turnos
El sistema SHALL mostrar advertencias de posibles duplicados dentro de los flujos de secretaria en Gestion de Turnos.

#### Scenario: Alta rapida de paciente con coincidencias
- **WHEN** secretaria carga un nuevo paciente desde el alta rapida de turno
- **THEN** el sistema muestra posibles pacientes duplicados antes de crear el paciente
- **AND** conserva disponible la accion de crear y seleccionar

#### Scenario: Ficha rapida con coincidencias
- **WHEN** secretaria edita datos administrativos del paciente desde la ficha rapida
- **THEN** el sistema muestra posibles pacientes duplicados excluyendo al paciente actual
- **AND** ofrece acceso a la ficha completa de cada coincidencia
