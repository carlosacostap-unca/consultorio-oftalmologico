## Why

Ahora que una consulta puede quedar en curso, el medico necesita una forma clara de encontrarla y retomarla sin buscar manualmente en el listado general. Esto evita que los avances queden perdidos y hace mas natural pausar y continuar la atencion.

## What Changes

- Mostrar una bandeja de consultas en curso para el medico.
- Permitir abrir rapidamente una consulta en curso para continuarla.
- Mostrar datos minimos para decidir que retomar: paciente, fecha, motivo y estado.
- Mantener el listado general de consultas como historial, sin convertirlo en la pantalla primaria para retomar avances.

## Capabilities

### New Capabilities

### Modified Capabilities
- `clinical-consultations`: Las consultas en curso deben poder identificarse y retomarse desde la interfaz medica.
- `doctor-daily-care-workflow`: La jornada medica debe exponer una bandeja operativa con consultas pendientes de cierre.

## Impact

- Afecta principalmente `/turnos` en el perfil medico y, si hace falta, helpers de consultas.
- Reutiliza el campo `consultas.estado` ya incorporado.
- No requiere nuevo schema de PocketBase.
- Requiere cobertura Playwright del flujo medico para verificar que una consulta en curso se muestra y puede retomarse.
