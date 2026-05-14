## Context

La aplicacion ya enlaza consultas con turnos y registra auditoria de creacion/edicion en `consulta_eventos`. Actualmente guardar una consulta desde un turno marca el turno como `Atendido` sin distinguir entre avance y cierre clinico.

## Goals / Non-Goals

**Goals:**
- Distinguir consultas en curso de consultas finalizadas.
- Mantener un guardado de avance sin cerrar el turno.
- Finalizar consulta y marcar turno como atendido cuando corresponda.
- Mostrar estado en lista y detalle.
- Registrar auditoria especifica de cambio de estado.

**Non-Goals:**
- No bloquear todavia la edicion de consultas finalizadas.
- No implementar anulacion con motivo obligatorio en esta etapa.
- No crear autosave ni borrador automatico antes del primer guardado.

## Decisions

- Usar campo `estado` en `consultas` con valores `borrador`, `en_curso`, `finalizada`, `anulada`.
- En nueva consulta, el boton "Guardar avance" crea la consulta con `estado = en_curso`.
- En nueva consulta, el boton "Finalizar consulta" crea la consulta con `estado = finalizada`.
- Si la consulta nace desde un turno, `en_curso` mantiene el turno en `En consulta` y `finalizada` lo marca `Atendido`.
- En edicion, "Guardar cambios" conserva el estado actual y "Finalizar consulta" cambia a `finalizada`.
- En auditoria, si cambia `estado`, el evento usa titulo especifico de cambio de estado.

## Risks / Trade-offs

- [Consultas historicas sin estado] -> La UI las tratara como `finalizada` para visualizacion.
- [Nuevo campo requiere esquema] -> Se agrega script idempotente e integracion en `schema:test`.
- [Finalizar desde nueva consulta] -> El primer guardado ya puede cerrar la consulta, manteniendo el flujo simple para medicos.
