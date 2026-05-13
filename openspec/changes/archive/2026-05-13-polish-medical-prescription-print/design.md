## Overview

La ruta `/recetas/[id]/imprimir` seguira siendo una pagina cliente que carga la receta desde PocketBase con `paciente_id` y `consulta_id` expandidos. El cambio se concentra en la composicion visual y en la informacion disponible para imprimir.

## Decisions

- Mantener la impresion en la ruta existente para no cambiar enlaces ni permisos.
- Usar `expand: "paciente_id,consulta_id"` y tipar campos opcionales de paciente y consulta para tolerar registros antiguos.
- Mostrar valores faltantes como `-` para evitar huecos visuales en la hoja impresa.
- Mantener las acciones ocultas en impresion con `print:hidden`.

## Validation

- Ejecutar build de Next.js.
- Ejecutar Playwright contra PocketBase de testing.
- Validar OpenSpec.
