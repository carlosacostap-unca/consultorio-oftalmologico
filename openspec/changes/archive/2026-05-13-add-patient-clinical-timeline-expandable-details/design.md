## Context

Los eventos de historia clinica se construyen en el cliente a partir de consultas y recetas ya cargadas. Actualmente cada evento muestra un resumen y acciones, pero no permite ver campos completos sin abrir otra pantalla.

## Goals / Non-Goals

**Goals:**

- Permitir expandir un evento para ver detalle clinico dentro de la ficha.
- Mantener un solo evento expandido a la vez para conservar la lectura compacta.
- Reutilizar los datos ya presentes en `ClinicalTimelineEvent`.

**Non-Goals:**

- Cargar datos adicionales desde PocketBase al expandir.
- Editar consultas o recetas desde el detalle expandido.
- Cambiar rutas de consulta o receta.

## Decisions

- Usar estado local `expandedClinicalTimelineEvent`.
  - Alternativa considerada: expandir multiples eventos a la vez. Se descarta para mantener la ficha escaneable.
- Agregar `detailRows` a cada evento.
  - Alternativa considerada: construir detalle con condicionales grandes en JSX. Se prefiere encapsular los campos al crear el evento.
- Mantener el boton `Ver detalle` dentro del grupo de acciones.
  - Alternativa considerada: hacer clic en toda la tarjeta. Se descarta para no competir con botones de navegacion.

## Risks / Trade-offs

- El detalle puede repetir parte del resumen -> se acepta porque evita navegar para revisar datos completos.
- Al filtrar o buscar, el evento expandido podria desaparecer -> no requiere limpieza explicita; simplemente no se renderiza hasta que vuelva a estar visible.
