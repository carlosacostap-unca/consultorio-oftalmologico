## Context

La pantalla `/turnos` ya tiene una vista diaria agrupada por medico, disponibilidad y turnos del dia. La mejora se concentra en enriquecer esa vista con informacion operativa y acciones rapidas, reutilizando los turnos ya cargados y el handler actual de cambio de estado.

## Goals / Non-Goals

**Goals:**
- Convertir la vista diaria en un tablero operativo para secretaria.
- Resumir el estado de la agenda por medico y del dia completo.
- Permitir filtrar rapidamente turnos por estado operativo.
- Permitir cambios de estado frecuentes sin abrir el modal de detalle.

**Non-Goals:**
- No se cambia la persistencia de estados.
- No se agregan roles ni permisos nuevos.
- No se modifica la impresion de turnos.
- No se reemplazan las vistas semanal, lista o disponibilidades.

## Decisions

- Mantener la logica en `app/turnos/page.tsx` para respetar el patron actual de la pantalla.
- Usar los estados existentes (`En espera`, `En consulta`, `Atendido`, `Ausente`, `Cancelado`) y tratar sobreturno como atributo visual.
- Implementar filtros en memoria sobre los turnos ya cargados para evitar consultas adicionales.
- Definir atraso como turno del dia cuya fecha/hora ya paso y continua en estado `En espera`.

## Risks / Trade-offs

- [Risk] La vista diaria puede quedar demasiado cargada visualmente. -> Mitigacion: usar chips compactos, filtros horizontales y acciones cortas.
- [Risk] El concepto de atraso depende de la hora local del navegador. -> Mitigacion: usar comparacion local consistente con la UI actual.
- [Risk] Nuevos botones pueden duplicar el selector de estado. -> Mitigacion: mantenerlos como atajos para estados frecuentes y conservar el selector para estados menos comunes.
