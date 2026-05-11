## Context

Gestion de Turnos ya concentra Agenda Diaria, Sala de espera, alta rapida, reprogramacion, cancelacion e historial operativo. La sala de espera actual agrupa por estado, pero las tarjetas todavia son basicas: no exponen todo el contexto de recepcion ni permiten cancelar desde la misma vista. El modelo de datos actual (`turnos.estado`, `turno_eventos`) alcanza para esta mejora.

## Goals / Non-Goals

**Goals:**

- Hacer que Sala de espera sea usable como tablero diario de secretaria.
- Mantener filtros por medico, fecha y paciente sin crear una ruta nueva.
- Mostrar datos operativos relevantes: hora, paciente, medico, DNI, telefono, obra social, tipo, motivo, observaciones y demora.
- Ofrecer acciones rapidas completas, incluida cancelacion con motivo obligatorio.
- Registrar eventos mediante el helper existente de historial.
- Cubrir el flujo con Playwright.

**Non-Goals:**

- No crear una pantalla separada para sala de espera.
- No modificar reglas ni esquema PocketBase.
- No implementar llamados al paciente, notificaciones ni reportes.
- No cambiar el significado canonico de los estados actuales.

## Decisions

- **Mantener la sala en `/turnos`.** La secretaria ya trabaja ahi y los filtros globales de medico/fecha/paciente son compartidos con Agenda Diaria.
- **Reutilizar `completeStatusChange`.** Las acciones de sala de espera actualizan `turnos.estado` y escriben en `turno_eventos`, evitando duplicar la logica de historial.
- **Tratar cancelacion como estado sensible.** `Cancelado` usa el mismo modal de motivo obligatorio que `Ausente`, con texto contextual.
- **Tarjetas por estado con densidad moderada.** La UI conserva los grupos actuales, pero agrega informacion operativa y acciones de recepcion en un bloque de botones consistente.
- **Calcular demora en cliente.** La demora depende de la hora actual y no requiere persistencia; se muestra solo cuando ayuda a priorizar.

## Risks / Trade-offs

- **Mas informacion por tarjeta puede cargar visualmente la pantalla** -> Usar jerarquia compacta y metadatos en lineas cortas.
- **Estados historicos con encoding heredado** -> Mantener compatibilidad con variantes existentes como `No llego` mal codificado.
- **Cancelaciones desde acciones rapidas sin actualizar observaciones** -> El historial operativo queda como fuente de trazabilidad; las observaciones se mantienen para ediciones/cancelacion desde modal.
