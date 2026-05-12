## Enfoque
La mejora se agrega encima del formulario existente en `app/consultas/[id]/page.tsx`, reutilizando `formData`, `selectedPacienteData`, `recetasAsociadas` y las acciones actuales.

## Decisiones
- El panel de continuidad se muestra para consultas existentes, tanto en modo vista como en edicion, porque aporta contexto sin desbloquear campos.
- Los indicadores se calculan en cliente desde los datos ya cargados: diagnostico, tratamiento, antecedentes activos y cantidad de recetas asociadas.
- Las acciones siguen usando las rutas existentes:
  - ficha clinica del paciente
  - nueva receta vinculada a consulta y paciente
  - impresion de anteojos
  - nueva consulta del paciente
- La seccion de recetas mantiene el listado actual pero agrega indicaciones y jerarquia visual mas clara.

## Fuera de alcance
- No se cambian campos clinicos ni validaciones.
- No se modifica el API de consultas.
- No se agregan recetas automaticas ni recomendaciones medicas.
