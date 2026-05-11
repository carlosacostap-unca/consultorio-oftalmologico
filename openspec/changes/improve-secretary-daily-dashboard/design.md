## Context

La vista diaria de `/turnos` ya concentra disponibilidad, turnos, estados y acciones. Sin embargo, la secretaria necesita leer el dia en segundos: carga por medico, pacientes en espera, proximos turnos y acciones inmediatas. Hoy esa informacion existe, pero compite visualmente con bloques largos y filtros dispersos.

## Goals / Non-Goals

**Goals:**

- Convertir la agenda diaria en un tablero de seguimiento del dia.
- Mantener la operacion multi-medico y el filtro por medico ya existentes.
- Mejorar la lectura por estado y paciente sin agregar nuevas colecciones.
- Cubrir el flujo con pruebas Playwright contra PocketBase test.

**Non-Goals:**

- No cambiar la estructura de `turnos` o `disponibilidades`.
- No implementar recordatorios, sala de espera fisica ni notificaciones externas.
- No reemplazar la vista semanal ni la lista general.

## Decisions

- Reusar los datos ya cargados en `/turnos` y derivar los indicadores en cliente.
- Priorizar una banda de resumen compacta arriba de la vista diaria, seguida por secciones por medico.
- Mantener los filtros actuales, pero hacer que su efecto sea evidente sobre el conteo y la lista del dia.
- Usar nombres accesibles en botones y secciones para sostener pruebas Playwright estables.

## Risks / Trade-offs

- [Risk] La pantalla puede saturarse si se muestran demasiados indicadores. -> Mitigacion: limitar el resumen a datos accionables del dia.
- [Risk] Filtros y busqueda pueden ocultar turnos y confundir. -> Mitigacion: mostrar conteos del resultado filtrado y mantener accion de limpiar.
- [Risk] Cambios visuales pueden romper pruebas existentes. -> Mitigacion: actualizar Playwright con selectores por rol/nombre, no por clases.
