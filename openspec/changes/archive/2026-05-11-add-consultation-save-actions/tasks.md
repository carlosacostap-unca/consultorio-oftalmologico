## Implementation

- [x] Actualizar `/consultas/nueva` para guardar la consulta sin redireccion automatica y mostrar confirmacion accionable.
- [x] Agregar acciones posteriores: abrir consulta, crear receta, imprimir anteojos y volver al contexto correspondiente.
- [x] Preservar retorno a `/turnos?tab=daily&date=<fecha>` cuando la consulta se inicio desde un turno.
- [x] Actualizar `/turnos` para inicializar pestaña diaria, fecha y medico desde query string.
- [x] Cubrir el flujo medico en Playwright con la nueva confirmacion y acciones.

## Validation

- [x] Ejecutar build de Next.js.
- [x] Ejecutar seed y suite Playwright contra PocketBase de testing.
- [x] Validar OpenSpec.
