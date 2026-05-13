## Context

La ficha de paciente ya construye los eventos de historia clinica en el cliente con consultas y recetas cargadas desde PocketBase. El filtro puede resolverse con estado local porque no cambia el origen de datos ni requiere paginacion.

## Goals / Non-Goals

**Goals:**

- Permitir alternar la historia clinica entre todos los eventos, consultas y recetas.
- Mostrar contadores de eventos por tipo.
- Conservar acciones y orden cronologico del filtro actual.

**Non-Goals:**

- Agregar filtros por fecha, texto libre o profesional.
- Modificar consultas a PocketBase.
- Persistir el filtro en URL o preferencias de usuario.

## Decisions

- Usar estado local `clinicalTimelineFilter` con valores `all`, `consulta`, `receta`.
  - Alternativa considerada: query string. Se descarta porque es una preferencia momentanea de lectura dentro de la ficha.
- Calcular contadores a partir de la linea de tiempo completa antes de aplicar el filtro.
  - Alternativa considerada: usar `consultas.length` y `recetas.length`. Se prefiere contar la misma lista de eventos que se muestra para evitar divergencias futuras.
- Reutilizar botones segmentados simples para no introducir dependencias ni componentes globales.
  - Alternativa considerada: tabs. Se descarta porque el control no cambia de seccion, solo filtra contenido dentro de la misma tarjeta.

## Risks / Trade-offs

- El limite de eventos se puede aplicar antes o despues de filtrar -> se aplicara luego del filtro para que "Consultas" y "Recetas" muestren hasta ocho eventos propios.
- Los textos de botones pueden competir visualmente en mobile -> usar flex con wrap y botones compactos.
