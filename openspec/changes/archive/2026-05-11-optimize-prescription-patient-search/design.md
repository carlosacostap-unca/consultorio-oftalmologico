## Context

`/recetas/nueva` y `/recetas/[id]` usan `getFullList` de `pacientes` para renderizar un selector. Otras pantallas ya usan busqueda paginada por nombre, apellido, documento o ficha.

## Goals / Non-Goals

**Goals:**

- Evitar cargar todos los pacientes al abrir recetas.
- Permitir buscar pacientes por apellido, nombre, documento o ficha.
- Mantener seleccionado y visible el paciente vinculado cuando llega por URL o desde una receta existente.
- Conservar la carga de consultas del paciente seleccionado.

**Non-Goals:**

- Crear un endpoint nuevo de busqueda.
- Cambiar el esquema PocketBase.
- Optimizar todos los selectores de pacientes del sistema.

## Decisions

- Usar `pb.collection("pacientes").getList(..., perPage: 20)` desde el cliente, igual que otros flujos existentes.
- Reutilizar `appendActivePatientFilter` para excluir pacientes fusionados.
- Cargar `getOne` para el paciente seleccionado inicial.
- Debounce de 300ms para busquedas del autocomplete.
- Mantener el texto del paciente seleccionado en el input.

## Risks / Trade-offs

- El selector deja de mostrar todos los pacientes disponibles sin busqueda. Se mitiga mostrando resultados iniciales ordenados y buscando por terminos.
- Se duplica algo de logica entre nueva receta y edicion; se acepta por alcance acotado y para evitar una abstraccion prematura.
