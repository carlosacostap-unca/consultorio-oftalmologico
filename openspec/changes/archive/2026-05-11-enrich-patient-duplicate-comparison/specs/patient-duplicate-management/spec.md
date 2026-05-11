## MODIFIED Requirements

### Requirement: Comparacion previa a fusion
El sistema SHALL comparar dos pacientes lado a lado antes de permitir fusionarlos.

#### Scenario: Comparar pacientes
- **WHEN** un admin selecciona dos pacientes para revisar
- **THEN** el sistema muestra datos personales, documento, telefono, obra social, numero de ficha y estado del registro de cada paciente
- **AND** muestra conteos de turnos, consultas y recetas asociadas a cada paciente
- **AND** muestra actividad reciente de turnos, consultas y recetas de cada paciente

#### Scenario: Elegir paciente principal
- **WHEN** el admin revisa dos pacientes comparados
- **THEN** el sistema permite elegir cual sera el paciente principal
- **AND** identifica al otro como paciente duplicado a archivar
