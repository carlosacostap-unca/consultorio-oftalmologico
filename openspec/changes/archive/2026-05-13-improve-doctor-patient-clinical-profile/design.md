## Overview

La mejora se concentra en `/pacientes/[id]?mode=view`. La pagina seguira cargando paciente, consultas y recetas desde PocketBase, pero la vista de lectura ordenara mejor la informacion clinica y agregara acciones rapidas.

## Decisions

- Mantener la misma ruta para no cambiar navegacion existente.
- Cargar recetas con `consulta_id` expandido para mostrar vinculacion y permitir volver al contexto clinico.
- Usar botones y enlaces con etiquetas accesibles para Playwright y teclado.
- Usar `window.print()` para imprimir la ficha sin crear una ruta nueva.
- Mantener el historial tabular existente como detalle completo y sumar una seccion breve de continuidad arriba.

## Validation

- Ejecutar build de Next.js.
- Ejecutar Playwright contra PocketBase de testing.
- Validar OpenSpec.
