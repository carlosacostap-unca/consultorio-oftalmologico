# Diseno

## Enfoque
La pantalla de paciente mantiene el formulario actual como fuente editable/lectura de datos administrativos, pero en modo vista agrega primero un resumen clinico orientado al medico.

## Decisiones
- Se reutilizan las colecciones existentes `pacientes`, `consultas` y `recetas`.
- Las recetas recientes se cargan por `paciente_id`, ordenadas por fecha descendente.
- Los antecedentes se leen desde los campos booleanos ya usados en los flujos de consulta.
- Las acciones clinicas navegan a los flujos existentes:
  - `/consultas/nueva?paciente_id=<id>`
  - `/recetas/nueva?paciente_id=<id>`

## Fuera de alcance
- No se modifica el modelo de permisos.
- No se agregan nuevos campos a PocketBase.
- No se reemplaza el formulario administrativo existente.
