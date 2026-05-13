## Context

La ficha de paciente carga consultas y recetas en el cliente y construye una lista unificada de eventos de historia clinica. El filtrado por tipo ya se resuelve localmente, por lo que la busqueda puede incorporarse en el mismo flujo sin nuevas consultas a PocketBase.

## Goals / Non-Goals

**Goals:**

- Buscar eventos clinicos por texto en los datos ya visibles o clinicamente relevantes.
- Mantener la busqueda combinada con los filtros Todo, Consultas y Recetas.
- Mostrar feedback claro cuando no hay coincidencias.

**Non-Goals:**

- Crear busqueda global de pacientes o consultas.
- Buscar en documentos adjuntos o campos no cargados en la ficha.
- Persistir la busqueda en URL o preferencias.

## Decisions

- Agregar `clinicalTimelineSearch` como estado local del componente.
  - Alternativa considerada: query string. Se descarta porque la busqueda es una accion temporal de lectura dentro de la ficha.
- Normalizar texto con minusculas y sin acentos antes de comparar.
  - Alternativa considerada: comparacion directa. Se descarta para que busquedas como "diagnostico" encuentren textos con o sin tildes.
- Incorporar un `searchText` calculado en cada evento.
  - Alternativa considerada: buscar solo en el contenido renderizado. Se prefiere un campo explicito para incluir fechas, tipo y campos secundarios de forma controlada.

## Risks / Trade-offs

- La busqueda local solo cubre eventos cargados en la ficha -> mantener el texto de la UI enfocado en historia reciente.
- Buscar en muchos eventos podria recalcular en cada render -> la cantidad actual es acotada y no requiere memoizacion prematura.
