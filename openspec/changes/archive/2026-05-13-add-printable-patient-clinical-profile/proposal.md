## Why

La ficha clinica del paciente ya ofrece una buena vista de trabajo para el medico, pero el boton de imprimir usa la pantalla operativa completa. Para archivo o PDF interno hace falta una hoja clara, sin navegacion ni controles, que concentre identificacion, antecedentes, consultas y recetas.

## What Changes

- Crear una ruta imprimible dedicada en `/pacientes/[id]/imprimir`.
- Mostrar datos del paciente, cobertura, contacto, antecedentes activos, ultimas consultas y recetas recientes.
- Agregar acciones fuera de impresion para imprimir y volver a la ficha.
- Cambiar el boton "Imprimir ficha" de la ficha de pantalla para abrir la nueva ruta.
- Cubrir el flujo con Playwright.

## Capabilities

### Modified Capabilities
- `patient-management`: Agrega impresion dedicada de ficha clinica del paciente.

## Impact

- Nueva ruta `app/pacientes/[id]/imprimir/page.tsx`.
- UI de `app/pacientes/[id]/page.tsx`.
- Pruebas Playwright.
- Especificacion OpenSpec de pacientes.
