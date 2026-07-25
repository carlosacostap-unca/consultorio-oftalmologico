## Context

La pantalla `/consultas` es compartida por roles y actualmente consulta PocketBase con `sort: "-fecha"`. Si existen fechas futuras invalidas, quedan al inicio del listado aunque no representen atenciones recientes.

## Goals / Non-Goals

**Goals:**
- Mostrar el listado general desde la consulta clinica mas reciente hacia atras.
- Evitar que fechas futuras invalidas dominen el listado principal.

**Non-Goals:**
- No corregir datos anomalos en esta tarea.
- No cambiar el comportamiento de busquedas por una fecha explicita.

## Decisions

- Agregar un filtro maximo por dia actual clinico cuando `filterDate` esta vacio.
- Mantener el filtro explicito de fecha sin ese limite adicional.
- Usar `sort: "-fecha,-created"` para estabilizar el orden entre consultas del mismo dia.

## Risks / Trade-offs

- [Risk] Una consulta futura legitima no aparece en el listado general -> Mitigation: las consultas clinicas son registros de atencion; si se necesita buscar una fecha futura puntual, el filtro explicito de fecha sigue disponible.
