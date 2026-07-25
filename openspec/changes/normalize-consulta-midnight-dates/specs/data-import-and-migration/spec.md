## ADDED Requirements

### Requirement: Normalizacion de fechas clinicas de consulta a medianoche UTC
El sistema SHALL proveer una migracion administrativa para normalizar consultas existentes cuya `fecha` este guardada a medianoche UTC exacta, conservando el mismo dia clinico y cambiando la hora a mediodia UTC.

#### Scenario: Diagnostico sin aplicar cambios
- **WHEN** el operador ejecuta la migracion sin `--apply`
- **THEN** el sistema lista el total de consultas candidatas
- **AND** informa ejemplos representativos
- **AND** escribe un reporte de dry-run sin modificar PocketBase

#### Scenario: Bloquear aplicacion sin confirmacion
- **WHEN** el operador ejecuta la migracion con `--apply` sin confirmacion explicita
- **THEN** el sistema aborta antes de actualizar consultas
- **AND** informa la confirmacion requerida

#### Scenario: Aplicar normalizacion confirmada
- **WHEN** el operador ejecuta la migracion con `--apply` y confirmacion explicita
- **THEN** el sistema guarda un backup de las consultas objetivo
- **AND** actualiza solo consultas cuya hora sea `00:00:00.000Z`
- **AND** cambia la hora a `12:00:00.000Z` manteniendo ano, mes y dia
- **AND** escribe un reporte de resultado con exitos, fallos y candidatas restantes
