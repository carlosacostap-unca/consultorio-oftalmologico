## 1. Preparacion

- [x] 1.1 Revisar docs locales de Next.js relevantes antes de tocar App Router.
- [x] 1.2 Revisar las vistas y estado derivado actual de `/turnos`.

## 2. Sala de espera

- [x] 2.1 Agregar `waiting-room` como vista de Gestion de Turnos y opcion visible "Sala de espera".
- [x] 2.2 Derivar turnos del dia por fecha, medico y estado operativo.
- [x] 2.3 Crear resumen operativo con conteos y proximo turno.
- [x] 2.4 Renderizar grupos Proximos, En espera, En consulta, Atendidos, Ausentes y Cancelados.
- [x] 2.5 Agregar acciones rapidas de recepcion en cada turno y reutilizar el modal de gestion existente.
- [x] 2.6 Asegurar que el modo multi-medico muestre el medico en cada turno.

## 3. Verificacion

- [x] 3.1 Actualizar/agregar pruebas Playwright para Sala de espera, grupos por estado y accion Llego.
- [x] 3.2 Ejecutar `npm.cmd run test:playwright:test`.
- [x] 3.3 Ejecutar `npm.cmd run build`.
- [x] 3.4 Ejecutar `npx.cmd openspec validate --all`.
