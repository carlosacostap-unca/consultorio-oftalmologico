## 1. Preparacion

- [x] 1.1 Revisar docs locales de Next.js relevantes para la pagina cliente.
- [x] 1.2 Revisar bloque actual de AV, PIO y refraccion en `/consultas/nueva`.

## 2. Implementacion

- [x] 2.1 Reorganizar AV en controles por OD/OI y sin/con correccion.
- [x] 2.2 Reorganizar PIO en controles OD/OI dentro del mismo bloque de examen.
- [x] 2.3 Reorganizar refraccion lejos y cerca en grillas ESF/CIL/EJE.
- [x] 2.4 Mantener ADD visible y sin modificar el calculo existente.
- [x] 2.5 Mantener nombres de campos y guardado sin cambios.

## 3. Pruebas y verificacion

- [x] 3.1 Actualizar Playwright para validar los nuevos bloques del examen.
- [x] 3.2 Ejecutar `npm.cmd run seed:test`.
- [x] 3.3 Ejecutar `npm.cmd run test:playwright:test`.
- [x] 3.4 Ejecutar `npm.cmd run build`.
- [x] 3.5 Ejecutar `npx.cmd openspec validate --all`.
