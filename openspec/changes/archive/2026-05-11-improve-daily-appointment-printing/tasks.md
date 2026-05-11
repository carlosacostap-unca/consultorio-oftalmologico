## 1. Preparacion

- [x] 1.1 Revisar docs locales de Next.js relevantes antes de tocar App Router.
- [x] 1.2 Revisar modal y pagina de impresion actuales.

## 2. Implementacion

- [x] 2.1 Agregar seleccion de medico al modal de impresion y preservar contexto actual.
- [x] 2.2 Enviar `medico_id` a `/turnos/imprimir`.
- [x] 2.3 Filtrar la pagina imprimible por medico cuando corresponda.
- [x] 2.4 Agrupar por medico cuando se imprimen todos.
- [x] 2.5 Mejorar encabezado, totales y compatibilidad de campos de paciente.

## 3. Pruebas y verificacion

- [x] 3.1 Agregar pruebas Playwright para impresion por medico y todos los medicos.
- [x] 3.2 Ejecutar `npm.cmd run seed:test`.
- [x] 3.3 Ejecutar `npm.cmd run test:playwright:test`.
- [x] 3.4 Ejecutar `npm.cmd run build`.
- [x] 3.5 Ejecutar `npx.cmd openspec validate --all`.
