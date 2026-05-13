## Overview

El listado seguira cargando recetas desde PocketBase con `paciente_id` y `consulta_id` expandidos. La mejora se concentra en filtrado local, informacion mostrada y accesos rapidos por fila.

## Decisions

- Mantener la carga actual ordenada por fecha descendente.
- Usar un filtro textual unico para paciente, documento, ficha, medicamento e indicaciones.
- Agregar un selector de vinculacion con valores `todas`, `con_consulta` y `sin_consulta`.
- Exponer acciones con etiquetas accesibles para que Playwright pueda validarlas y para mejorar teclado/lectores.
- Mantener la eliminacion con confirmacion.

## Validation

- Ejecutar build de Next.js.
- Ejecutar Playwright contra PocketBase de testing.
- Validar OpenSpec.
