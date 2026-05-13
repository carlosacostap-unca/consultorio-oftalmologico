## Context

La ficha de paciente en `/pacientes/[id]?mode=view` ya carga datos del paciente, consultas y recetas recientes desde PocketBase. La informacion existe, pero esta repartida entre metricas, continuidad, historial de consultas y recetas recientes.

## Goals / Non-Goals

**Goals:**

- Mostrar una historia clinica unificada y escaneable dentro de la ficha del paciente.
- Reutilizar las consultas y recetas que ya se cargan en la pantalla.
- Mantener acciones directas para abrir consultas, recetas e impresiones cuando corresponda.
- Cubrir el flujo con Playwright usando datos reales del entorno de testing.

**Non-Goals:**

- Crear nuevos registros clinicos o modificar el esquema de PocketBase.
- Reemplazar el historial tabular de consultas o la seccion de recetas recientes.
- Implementar filtros avanzados, paginacion o busqueda dentro de la historia clinica.

## Decisions

- La linea de tiempo se construira en el cliente a partir de `consultas` y `recetas`.
  - Alternativa considerada: crear una coleccion o endpoint dedicado. Se descarta por ahora porque no hay transformacion compleja ni necesidad de persistencia adicional.
- Se mostraran los eventos recientes ordenados por fecha descendente y limitados a un numero acotado.
  - Alternativa considerada: mostrar todo el historial. Se descarta para no duplicar la tabla completa ni sobrecargar la primera lectura clinica.
- Cada evento usara una tarjeta compacta con tipo, fecha, resumen y acciones.
  - Alternativa considerada: una tabla mixta. Se descarta porque consultas y recetas tienen campos distintos y la tarjeta permite escanear mejor el contexto clinico.

## Risks / Trade-offs

- La fecha de receta o consulta puede estar incompleta o tener formato invalido -> usar formateo defensivo y ordenar registros sin fecha al final.
- La seccion puede duplicar informacion ya visible -> mantenerla como resumen temporal y conservar las secciones detalladas abajo.
- Un paciente con muchos registros podria generar demasiados eventos -> limitar la vista inicial a eventos recientes.
