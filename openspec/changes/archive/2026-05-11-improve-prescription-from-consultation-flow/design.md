## Context

La nueva receta ya usa `useSearchParams` y esta envuelta en `Suspense`, por lo que puede leer `consulta_id` y `paciente_id` de forma compatible con Next.js. La pantalla carga pacientes y consultas, crea el registro en `recetas` y luego redirige.

## Goals / Non-Goals

**Goals:**

- Dar contexto clinico antes de guardar una receta vinculada.
- Evitar que el medico pierda el flujo al guardar.
- Ofrecer acciones explicitas despues de guardar.
- Mantener el comportamiento existente para recetas libres.

**Non-Goals:**

- Crear un nuevo tipo de receta persistido.
- Cambiar el modelo de PocketBase.
- Implementar impresion propia de recetas medicas.
- Rehacer la pantalla de edicion de receta.

## Decisions

- Agregar estado `selectedPacienteData`, `selectedConsultaData` y `savedPrescription` en `/recetas/nueva`.
- Cargar paciente puntual y consulta puntual cuando vienen por query string, ademas de conservar el listado/select actual.
- Mostrar un bloque de contexto antes del formulario y una accion de anteojos si hay consulta vinculada.
- Al guardar, guardar el ID de receta creada y mostrar una confirmacion con enlaces.
- Deshabilitar el submit despues de guardar para evitar duplicados.

## Risks / Trade-offs

- El formulario sigue cargando todos los pacientes como antes; no se aborda la optimizacion de busqueda en esta iteracion.
- La receta de anteojos sigue siendo la impresion de la consulta, no un registro nuevo de `recetas`.
