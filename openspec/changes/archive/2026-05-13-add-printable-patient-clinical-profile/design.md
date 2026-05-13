## Overview

La nueva ruta imprimible cargara paciente, consultas y recetas directamente desde PocketBase. Sera una pagina cliente para mantener el mismo patron de otras impresiones del proyecto y poder usar la sesion actual de PocketBase.

## Decisions

- Usar `/pacientes/[id]/imprimir` para no sobrecargar la ficha operativa con reglas de impresion.
- Cargar `pacientes` con `mutual_id`, consultas ordenadas por fecha descendente y recetas con `consulta_id` expandido.
- Mostrar hasta cinco consultas y cinco recetas para una hoja concisa.
- Mantener los botones `Imprimir`, `Volver a ficha` y `Cerrar` ocultos con `print:hidden`.
- Usar valores `-` cuando falten datos para evitar huecos visuales.

## Validation

- Ejecutar build de Next.js.
- Ejecutar Playwright contra PocketBase de testing.
- Validar OpenSpec.
