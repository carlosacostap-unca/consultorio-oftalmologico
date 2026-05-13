## Context

La ficha del paciente ya construye eventos de historia clinica en el cliente. Los eventos de receta tienen rutas de ver, imprimir y consulta vinculada. Los eventos de consulta hoy solo permiten abrir la consulta.

## Goals / Non-Goals

**Goals:**

- Agregar acciones contextuales a eventos de consulta.
- Reutilizar rutas existentes de impresion de consulta y nueva receta desde consulta.
- Mantener la estructura visual de acciones compacta.

**Non-Goals:**

- Cambiar permisos o reglas de PocketBase.
- Crear nuevas rutas.
- Modificar el formulario de recetas.

## Decisions

- Extender `ClinicalTimelineEvent` con `newPrescriptionHref`.
  - Alternativa considerada: condicionar rutas directamente en JSX por tipo de evento. Se prefiere mantener el render desacoplado de la construccion de eventos.
- Usar `/consultas/[id]/imprimir` para imprimir consulta y `/recetas/nueva?consulta_id=<id>` para emitir receta vinculada.
  - Alternativa considerada: usar `paciente_id` para receta nueva. Se descarta porque desde una consulta el contexto clinico correcto es la consulta asociada.

## Risks / Trade-offs

- Mas botones pueden ocupar espacio en mobile -> conservar flex wrap y estilos compactos.
- Si una consulta no tiene datos suficientes, la receta vinculada dependera del flujo existente de receta nueva -> no se cambia ese comportamiento.
