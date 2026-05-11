## ADDED Requirements

### Requirement: Seeds de testing aislados
El sistema SHALL permitir ejecutar seeds demo contra una instancia PocketBase de testing separada de produccion.

#### Scenario: Ejecutar seeds de testing
- **WHEN** el desarrollador ejecuta el script de seed de testing
- **THEN** el sistema carga variables desde `.env.test.local`
- **AND** crea o actualiza usuarios, pacientes, disponibilidades y turnos demo en la instancia configurada

#### Scenario: Bloquear seed contra produccion
- **WHEN** el script de seed de testing detecta una URL que parece produccion
- **THEN** el sistema aborta antes de escribir datos
- **AND** muestra un error que indique revisar la configuracion de PocketBase
