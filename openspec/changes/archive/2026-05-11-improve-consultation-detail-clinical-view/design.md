## Context

La ruta `/consultas/[id]` ya carga consulta, paciente, recetas asociadas y navegacion entre consultas del paciente. El problema es que el detalle se presenta casi exclusivamente como un formulario, por lo que la lectura clinica posterior al guardado requiere recorrer campos.

## Goals / Non-Goals

**Goals:**

- Priorizar una lectura rapida del estado clinico de la consulta.
- Dar acciones claras despues de abrir la consulta guardada.
- Reutilizar datos ya cargados por la pantalla actual.
- Mantener intacta la edicion protegida por `consulta_edit_limit_days`.

**Non-Goals:**

- Cambiar el esquema de `consultas`, `pacientes` o `recetas`.
- Rehacer todo el formulario legacy.
- Cambiar la impresion de anteojos.
- Cambiar permisos del rol medico.

## Decisions

- Incorporar un bloque de resumen antes del formulario existente.
- Usar helpers locales para renderizar valores vacios como `-` y evitar duplicar logica.
- Mostrar antecedentes activos como chips para que sean visibles aun en modo lectura.
- Mantener los botones actuales de navegacion y sumar acciones rapidas con `Link`.
- Extender el test medico para abrir la consulta desde la confirmacion y verificar el resumen.

## Risks / Trade-offs

- La pantalla queda con resumen y formulario, lo que agrega contenido vertical. Se mitiga ubicando el resumen arriba y dejando el formulario como detalle/edicion.
- Algunos campos pueden estar vacios en consultas historicas. Se mitiga mostrando `-` y no ocultando secciones completas.
