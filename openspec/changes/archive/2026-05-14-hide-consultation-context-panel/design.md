## Context

La version compacta anterior movio el contexto clinico a un panel lateral fijo. En la practica, el panel aun genera una experiencia con scroll y reduce el espacio disponible para campos clinicos.

## Goals / Non-Goals

**Goals:**
- Que la carga principal de `/consultas/nueva` use todo el ancho disponible en escritorio.
- Que el contexto clinico este oculto por defecto y pueda abrirse con un boton.
- Que el contexto abierto no aumente la altura del documento ni reserve espacio fijo.
- Que en Full HD los controles principales de carga y guardado entren en el viewport.

**Non-Goals:**
- No eliminar el contexto clinico previo.
- No cambiar el modelo de datos ni guardado de consultas.
- No cambiar la vista de detalle de consulta.

## Decisions

- Usar estado local para mostrar/ocultar contexto.
- Mostrar el contexto como panel overlay en escritorio, alineado a la derecha y con scroll interno.
- Ocultar las secciones de resumen/contexto inline en escritorio para evitar duplicacion visual.
- Usar una grilla clinica mas ancha para agudeza visual, presion ocular, refraccion, examen y cierre.
- Mantener labels y campos existentes para no romper el flujo de carga.

## Risks / Trade-offs

- [El contexto queda a un click] -> Se compensa con un boton visible en la cabecera del formulario.
- [Overlay sobre contenido] -> El panel tendra z-index y fondo para lectura; al cerrarlo no afecta la carga.
- [Full HD depende del chrome del navegador] -> La prueba verificara el alto del documento en viewport 1920x1080.
