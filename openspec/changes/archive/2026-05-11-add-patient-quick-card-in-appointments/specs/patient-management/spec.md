## ADDED Requirements

### Requirement: Edicion contextual minima de paciente
El sistema SHALL permitir ediciones administrativas minimas de paciente desde contextos operativos sin reemplazar la ficha completa.

#### Scenario: Editar desde turnos
- **WHEN** un usuario autenticado edita datos administrativos minimos del paciente desde Gestion de Turnos
- **THEN** el sistema guarda los cambios en `pacientes`
- **AND** la ficha completa del paciente conserva esos datos actualizados

#### Scenario: Acceder a ficha completa
- **WHEN** el usuario necesita ver o editar datos fuera del alcance minimo
- **THEN** el sistema ofrece navegacion a `/pacientes/<id>?mode=view`
