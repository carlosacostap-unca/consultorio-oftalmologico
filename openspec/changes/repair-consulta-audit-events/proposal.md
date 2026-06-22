## Why

La auditoria de consultas no esta registrando eventos para consultas creadas recientemente en produccion. El diagnostico mostro consultas creadas desde el 2026-06-17 sin registros en `consulta_eventos`, aunque la coleccion existe y tiene eventos previos.

## What Changes

- Agregar una herramienta de backfill con dry-run para detectar consultas sin eventos de auditoria.
- Permitir crear eventos retroactivos minimos solo con confirmacion explicita.
- Mantener el alcance acotado por fecha para evitar tocar historicos importados sin decision clinica.

## Capabilities

### Modified Capabilities
- `clinical-consultations`: La auditoria debe poder repararse para consultas creadas por la app que quedaron sin eventos.

## Impact

- No modifica schema.
- Agrega script operacional con reporte en `reports/`.
- El modo apply crea registros en `consulta_eventos`; debe ejecutarse solo tras confirmacion explicita.
