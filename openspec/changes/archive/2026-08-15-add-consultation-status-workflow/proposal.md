## Why

Las consultas guardadas no siempre representan el mismo punto del proceso clinico. Un medico puede necesitar guardar un avance, continuar una atencion o cerrar definitivamente la consulta. Para ordenar la jornada y preparar reglas futuras, necesitamos estados visibles y auditables.

## What Changes

- Agregar estado a las consultas: `en_curso`, `finalizada`, `anulada` y `borrador`.
- Permitir guardar una nueva consulta como avance o finalizarla.
- Mostrar el estado en listados y detalle.
- Registrar eventos de auditoria cuando cambia el estado.
- Asegurar el campo `estado` en el esquema de PocketBase.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: Las consultas deben tener estado operativo visible y auditable.

## Impact

- Afecta esquema PocketBase de `consultas`.
- Afecta `/consultas/nueva`, `/consultas`, `/consultas/[id]` y `PATCH /api/consultas/[id]`.
- Afecta helpers y script de auditoria de consultas.
- Actualiza cobertura Playwright del flujo medico.
