## Context

La pantalla de nueva consulta ya muestra contexto clinico y conserva todos los campos. El siguiente problema es de carga estructurada: AV/PIO y refraccion requieren comparar OD/OI y lejos/cerca, pero los controles actuales no forman una grilla clinica clara.

## Goals / Non-Goals

**Goals:**

- Hacer mas escaneables AV y PIO agrupando OD/OI en controles equivalentes.
- Reordenar refraccion lejos/cerca en grillas con columnas ESF, CIL y EJE.
- Mantener ADD visible y el calculo automatico existente.
- Preservar nombres de campos y guardado actual.

**Non-Goals:**

- Agregar validaciones numericas estrictas.
- Cambiar el modelo de datos o scripts de importacion.
- Redisenar la pantalla de consulta existente en modo edicion.

## Decisions

- Reemplazar solo el bloque visual de AV/PIO/refraccion en `app/consultas/nueva/page.tsx`.
- Usar inputs existentes con los mismos `name` para evitar cambios en persistencia.
- Mantener el formulario como componente cliente unico en esta etapa.
- Usar labels visibles y placeholders cortos para mejorar carga sin agregar ayuda textual larga.

## Risks / Trade-offs

- Mas estructura visual puede ocupar algo mas de alto en pantallas chicas -> Mitigacion: grillas responsive y columnas que apilan en mobile.
- El archivo sigue siendo grande -> Mitigacion: no introducir refactor amplio en este cambio.
