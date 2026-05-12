## Context

`/recetas/[id]` ya carga receta, paciente puntual y consultas del paciente. La receta de anteojos se imprime desde consulta, pero la receta medica no tiene vista imprimible propia.

## Goals / Non-Goals

**Goals:**

- Hacer que `mode=view` sea una vista de lectura clinica clara.
- Agregar una impresion sencilla de receta medica.
- Conservar los enlaces de retorno a consulta y paciente.
- Mantener el formulario de edicion sin alterar el modelo de datos.

**Non-Goals:**

- Cambiar estructura de datos de recetas.
- Diseñar talonarios complejos o firma digital.
- Cambiar la impresion de anteojos existente.

## Decisions

- Agregar un panel superior de resumen en `/recetas/[id]`, visible tanto en lectura como edicion.
- Incluir un enlace a `/recetas/[id]/imprimir` en la vista y en la confirmacion post-guardado.
- Implementar `/recetas/[id]/imprimir` como client component similar a la impresion de anteojos.
- Usar `window.print()` en la ruta imprimible.

## Risks / Trade-offs

- La impresion medica usa el contenido guardado en `medicamentos` e `indicaciones` sin estructurar por items. Se acepta porque respeta el esquema actual.
- La vista imprimible depende de carga client-side desde PocketBase, igual que la impresion de anteojos actual.
