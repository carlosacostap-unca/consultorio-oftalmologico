## Context

La pantalla `/consultas/nueva` ya concentra seleccion de paciente, antecedentes, motivo, examen, refraccion, cierre clinico y contexto previo. El contexto clinico agregado aporta valor, pero en desktop aumenta demasiado el alto de pagina antes de llegar a los campos de atencion.

## Goals / Non-Goals

**Goals:**
- Priorizar la carga clinica en el primer viewport de escritorio.
- Evitar scroll vertical de pagina en Full HD cuando la consulta esta en estado de carga.
- Mantener todos los campos actuales disponibles.
- Conservar contexto previo, pero en un panel lateral navegable.

**Non-Goals:**
- No redisenar la ficha clinica completa.
- No eliminar campos clinicos.
- No cambiar reglas de guardado ni auditoria.
- No optimizar todavia la vista de edicion de consulta existente.

## Decisions

- En pantallas `2xl`, usar una grilla principal con formulario clinico y panel lateral.
- Ubicar resumen del paciente, atencion actual y contexto previo dentro del panel lateral.
- Reducir paddings, margenes y textos auxiliares repetidos en la carga principal.
- Usar `max-height` y `overflow-y-auto` solo en el panel lateral de contexto para que el documento no crezca por ese contenido.
- Mantener layout vertical tradicional en pantallas chicas.

## Risks / Trade-offs

- [Panel lateral con scroll propio] -> En desktop se evita scroll de pagina, pero el contexto previo puede requerir scroll dentro del panel cuando hay mucha historia.
- [Menos aire visual] -> La pantalla queda mas densa; se compensa manteniendo secciones, bordes y titulos claros.
- [Alturas fijas en desktop] -> Usar constraints responsive para no perjudicar monitores mas bajos o pantallas chicas.
