## Context

`/consultas/nueva` muestra una confirmacion despues de crear la consulta y ya ofrece enlaces a consulta, receta, impresion de anteojos y retorno. La mejora reorganiza esas acciones, usando datos que ya existen en `formData` y `selectedTurnoData`.

## Goals / Non-Goals

**Goals:**
- Destacar una accion principal recomendada al finalizar la atencion.
- Explicar brevemente por que se recomienda esa accion.
- Mantener disponibles las acciones secundarias actuales.

**Non-Goals:**
- No crear nuevas rutas ni endpoints.
- No automatizar creacion de recetas o impresiones.
- No cambiar reglas de permisos ni estado del turno fuera del comportamiento actual.

## Decisions

- Calcular la recomendacion en cliente a partir de los datos ya cargados: tratamiento, refraccion y origen desde turno.
- Priorizar tratamiento sobre anteojos porque suele requerir continuidad terapeutica inmediata.
- Mantener "Volver a jornada" como accion secundaria siempre que exista `turno_id`, aunque no sea la recomendacion principal.
- Agregar acceso directo a la ficha del paciente para cerrar el circuito clinico sin depender del detalle de consulta.

## Risks / Trade-offs

- [La recomendacion puede no cubrir todos los criterios medicos] -> Se mantiene como sugerencia visual y no bloquea ninguna accion.
- [Panel mas denso] -> Separar accion recomendada de acciones secundarias.
- [Tests fragiles por textos] -> Cubrir nombres de acciones estables y enlaces generados.
