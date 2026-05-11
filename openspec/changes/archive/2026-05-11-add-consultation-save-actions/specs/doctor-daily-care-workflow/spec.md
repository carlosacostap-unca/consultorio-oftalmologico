## ADDED Requirements

### Requirement: Apertura directa de jornada diaria
El sistema SHALL permitir abrir la gestion de turnos en una pestaña y fecha especificas mediante parametros de URL.

#### Scenario: Abrir agenda diaria por URL
- **WHEN** el usuario abre `/turnos?tab=daily&date=<fecha>`
- **THEN** el sistema muestra la pestaña de agenda diaria
- **AND** usa `<fecha>` como fecha activa de la jornada

#### Scenario: Preservar medico seleccionado por URL
- **WHEN** el usuario abre `/turnos?tab=daily&date=<fecha>&medico_id=<medico>`
- **THEN** el sistema intenta usar `<medico>` como medico seleccionado cuando el rol activo puede gestionar mas de una agenda
- **AND** mantiene el comportamiento de agenda propia cuando el rol activo es `medico`
