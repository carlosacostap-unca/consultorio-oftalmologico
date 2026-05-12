## Why
El medico necesita entregar o archivar un resumen imprimible de la consulta completa. Hoy existen impresiones parciales, como receta medica y receta de anteojos, pero no una hoja clinica que reúna motivo, examen, diagnostico, tratamiento, antecedentes y recetas asociadas.

## What Changes
- Agrega una vista imprimible `/consultas/[id]/imprimir` para informe clinico de consulta.
- Incluye datos del paciente, fecha, motivo, antecedentes, examen oftalmologico, refraccion, diagnostico, tratamiento y recetas asociadas.
- Agrega una accion visible para imprimir informe clinico desde el detalle de consulta.
- Amplia la prueba Playwright del flujo medico para verificar el informe.

## Impact
- Modifica navegacion/acciones de consulta existente.
- Agrega una ruta nueva de impresion sin cambios de esquema en PocketBase.
- Mantiene las impresiones existentes de receta y anteojos.
