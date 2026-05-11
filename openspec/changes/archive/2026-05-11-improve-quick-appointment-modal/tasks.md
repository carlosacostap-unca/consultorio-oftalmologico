## 1. Preparacion

- [x] 1.1 Revisar docs locales de Next.js relevantes antes de tocar App Router.
- [x] 1.2 Revisar el estado actual del modal de alta rapida en `app/turnos/page.tsx`.

## 2. Modal de alta rapida

- [x] 2.1 Reorganizar el encabezado del modal con resumen visible de turno, medico, fecha, hora, tipo, disponibilidad y modo.
- [x] 2.2 Mejorar la seleccion de paciente con estado de busqueda, estado sin resultados y bloque de paciente seleccionado.
- [x] 2.3 Mantener la creacion minima de paciente integrada y dejar seleccionado el paciente creado.
- [x] 2.4 Reforzar advertencias de turnos activos y sobreturno con confirmacion explicita antes de guardar.
- [x] 2.5 Mostrar confirmacion de guardado y actualizar agenda diaria sin abandonar `/turnos`.

## 3. Verificacion

- [x] 3.1 Actualizar/agregar pruebas Playwright para alta rapida regular, paciente seleccionado, advertencias y sobreturno.
- [x] 3.2 Ejecutar `npm.cmd run test:playwright:test`.
- [x] 3.3 Ejecutar `npm.cmd run build`.
- [x] 3.4 Ejecutar `npx.cmd openspec validate --all`.
