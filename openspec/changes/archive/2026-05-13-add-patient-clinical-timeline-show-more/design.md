## Context

La ficha de paciente construye una lista de eventos de historia clinica en el cliente. Actualmente la lista se limita a ocho eventos luego de aplicar filtro y busqueda.

## Goals / Non-Goals

**Goals:**

- Mantener la ficha compacta por defecto.
- Permitir ver todos los eventos que coinciden con filtro y busqueda actuales.
- Volver facilmente al resumen inicial.

**Non-Goals:**

- Implementar paginacion real o carga incremental desde PocketBase.
- Cambiar el orden cronologico ni los filtros existentes.
- Persistir la preferencia de mostrar mas.

## Decisions

- Usar un estado local booleano `showAllClinicalTimelineEvents`.
  - Alternativa considerada: seleccionar cantidad por pasos. Se descarta porque la necesidad actual es alternar resumen/lista completa.
- Aplicar filtro y busqueda antes de limitar la lista visible.
  - Alternativa considerada: limitar primero y filtrar despues. Se descarta porque puede ocultar coincidencias relevantes.
- Resetear implicitamente la cantidad visible con el boton `Mostrar menos`; no resetear automaticamente al buscar o filtrar.
  - Alternativa considerada: contraer siempre ante cada filtro. Se descarta para evitar movimientos inesperados mientras el medico explora.

## Risks / Trade-offs

- Una lista completa muy larga puede ocupar mucho espacio -> el usuario la abre explicitamente y puede volver a `Mostrar menos`.
- Con pocos eventos no habra controles visibles -> evita ruido en fichas pequenas.
