## Context

`/consultas/nueva` ya carga paciente, turno, antecedentes y el formulario oftalmologico. La ficha del paciente ya resuelve una vista amplia de continuidad clinica, pero el medico pierde ese contexto cuando entra al formulario de atencion.

## Goals / Non-Goals

**Goals:**
- Cargar un resumen compacto de consultas y recetas previas del paciente seleccionado.
- Mostrarlo dentro de la nueva consulta sin interrumpir la carga clinica.
- Reutilizar datos existentes de PocketBase y enlaces actuales a consultas/recetas.

**Non-Goals:**
- No modificar colecciones, reglas ni migraciones de PocketBase.
- No reemplazar la ficha clinica completa del paciente.
- No agregar edicion de consultas o recetas previas desde esta vista.

## Decisions

- Cargar consultas y recetas desde el cliente cuando cambia `paciente_id`, igual que la pantalla de paciente.
- Limitar el contexto a pocos registros recientes para evitar un formulario largo y consultas pesadas.
- Mostrar enlaces a vista de consulta y receta en pestañas/rutas existentes, manteniendo la navegacion actual.
- Usar estados de carga y vacio para pacientes sin historia previa.

## Risks / Trade-offs

- [Mas lecturas al abrir nueva consulta] -> Limitar a registros recientes y cargar solo cuando hay paciente seleccionado.
- [Formulario mas largo] -> Presentar el contexto como tarjeta compacta antes de la carga clinica.
- [Datos previos incompletos] -> Mostrar guiones o textos de vacio sin bloquear el guardado.
