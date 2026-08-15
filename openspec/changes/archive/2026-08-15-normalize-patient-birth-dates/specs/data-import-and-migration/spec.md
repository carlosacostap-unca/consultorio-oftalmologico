## MODIFIED Requirements

### Requirement: Normalizacion de fechas de nacimiento de pacientes
El sistema SHALL proveer un script administrativo para normalizar `pacientes.fecha_nacimiento` guardadas a medianoche UTC.

#### Scenario: Ejecutar diagnostico sin aplicar cambios
- **WHEN** se ejecuta el script sin `--apply`
- **THEN** el script lista candidatos con `fecha_nacimiento` exactamente a `00:00:00.000Z`
- **AND** escribe un reporte dry-run en `reports/`
- **AND** no modifica registros en PocketBase

#### Scenario: Aplicar normalizacion confirmada
- **WHEN** se ejecuta el script con `--apply --confirm=CONFIRMO_NORMALIZAR_FECHAS_NACIMIENTO`
- **THEN** el script crea un respaldo de los registros candidatos antes de actualizar
- **AND** cambia solo la hora de `00:00:00.000Z` a `12:00:00.000Z`
- **AND** conserva el mismo anio, mes y dia calendario
- **AND** escribe un reporte con actualizados, fallidos y remanentes

#### Scenario: Bloquear apply sin confirmacion
- **WHEN** se ejecuta el script con `--apply` sin la confirmacion exacta
- **THEN** el script aborta antes de modificar datos
- **AND** informa la confirmacion requerida
