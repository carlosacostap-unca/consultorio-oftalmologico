## ADDED Requirements

### Requirement: Pruebas Playwright contra PocketBase de testing
El sistema SHALL ejecutar las pruebas automatizadas de turnos contra una instancia PocketBase de testing cuando se use el script de testing.

#### Scenario: Ejecutar Playwright en testing
- **WHEN** el desarrollador ejecuta el script Playwright de testing
- **THEN** el sistema carga `.env.test.local` antes de iniciar Next.js
- **AND** las pruebas usan la URL y credenciales PocketBase de testing

#### Scenario: Bloquear Playwright contra produccion
- **WHEN** las pruebas detectan una URL PocketBase que parece produccion
- **THEN** el sistema aborta antes de ejecutar flujos que escriben datos
- **AND** informa que debe configurarse una instancia de testing
