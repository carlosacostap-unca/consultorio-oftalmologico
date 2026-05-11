## ADDED Requirements

### Requirement: Pacientes fusionados en gestion de pacientes
El sistema SHALL identificar pacientes fusionados y evitar que aparezcan como pacientes activos en flujos normales.

#### Scenario: Listado omite fusionados por defecto
- **WHEN** un usuario abre el listado normal de pacientes
- **THEN** el sistema muestra pacientes activos
- **AND** omite registros marcados como fusionados salvo que se active una vista administrativa especifica

#### Scenario: Ficha de paciente fusionado
- **WHEN** un usuario abre la ficha de un paciente fusionado
- **THEN** el sistema informa que el registro fue fusionado
- **AND** muestra un enlace al paciente principal

#### Scenario: Crear o editar paciente activo
- **WHEN** un usuario crea o edita un paciente activo
- **THEN** el sistema conserva las validaciones actuales de documento y numero de ficha
- **AND** no considera disponibles los numeros de ficha de pacientes activos
