## ADDED Requirements

### Requirement: Migracion de schema de atribucion medica clinica
El sistema SHALL proveer una migracion idempotente para agregar campos de medico responsable en consultas y recetas sin modificar registros historicos.

#### Scenario: Asegurar campos de medico
- **WHEN** se ejecuta la migracion de atribucion medica
- **THEN** el sistema asegura `consultas.medico_id` como relation hacia `users`
- **AND** asegura `recetas.medico_id` como relation hacia `users`

#### Scenario: No modificar historicos
- **WHEN** se ejecuta la migracion de atribucion medica
- **THEN** no infiere ni escribe `medico_id` en consultas o recetas existentes

#### Scenario: Reejecutar migracion
- **WHEN** la migracion se ejecuta mas de una vez
- **THEN** no duplica campos ni sobrescribe atribuciones medicas cargadas manualmente
