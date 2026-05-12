## Why
La receta de anteojos es un documento frecuente y hoy tiene un formato basico. Conviene alinearla con el informe clinico imprimible para que incluya datos completos del paciente, contexto de consulta y una presentacion mas profesional.

## What Changes
- Mejora `/consultas/[id]/imprimir-anteojos` con cabecera, datos completos del paciente y contexto clinico.
- Muestra ficha, documento, obra social, fecha, diagnostico y ADD cuando existan.
- Ordena las tablas de lejos/cerca en un formato imprimible mas claro.
- Agrega accion para volver a la consulta ademas de imprimir/cerrar.

## Impact
- Modifica solo la vista imprimible de anteojos.
- No requiere cambios de esquema en PocketBase.
- Amplia cobertura Playwright del flujo medico de impresion.
