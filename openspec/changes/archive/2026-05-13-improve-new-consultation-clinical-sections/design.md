## Context

`/consultas/nueva` ya carga paciente, turno, antecedentes, datos oftalmologicos, refraccion y acciones posteriores al guardado. El cambio se limita a mejorar la lectura y carga del formulario, sin alterar el modelo de datos.

## Goals / Non-Goals

**Goals:**

- Hacer mas clara la secuencia clinica de carga.
- Dar mas espacio a campos narrativos de examen, diagnostico y tratamiento.
- Mantener compatibilidad con los campos y tests existentes.

**Non-Goals:**

- Cambiar la coleccion `consultas`.
- Agregar campos clinicos nuevos.
- Rehacer toda la pantalla o extraer componentes.

## Decisions

- Mantener los mismos `name` de campos para conservar el guardado actual.
  - Alternativa considerada: crear un estado nuevo por seccion. Se descarta porque no aporta al cambio visual y aumenta riesgo.
- Usar `textarea` para campos narrativos.
  - Alternativa considerada: inputs mas anchos. Se descarta porque textos clinicos como diagnostico y tratamiento suelen necesitar varias lineas.
- Separar el bloque final en dos tarjetas: examen oftalmologico y cierre clinico.
  - Alternativa considerada: mantener un bloque unico. Se descarta porque mezcla hallazgos de examen con decisiones clinicas.

## Risks / Trade-offs

- Los labels existentes pueden cambiar levemente y afectar tests -> actualizar cobertura Playwright con selectores por label.
- El formulario puede crecer verticalmente -> se acepta porque mejora la escritura clinica y mantiene las acciones finales.
