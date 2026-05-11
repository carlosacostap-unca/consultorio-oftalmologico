## 1. Preparacion

- [x] 1.1 Revisar docs locales de Next.js relevantes antes de tocar App Router.
- [x] 1.2 Revisar flujos de alta rapida y ficha rapida de paciente.

## 2. Implementacion

- [x] 2.1 Agregar tipos y estado para advertencias de duplicados.
- [x] 2.2 Implementar helper de busqueda de posibles duplicados en `pacientes`.
- [x] 2.3 Mostrar advertencias en alta rapida de nuevo paciente.
- [x] 2.4 Mostrar advertencias en ficha rapida excluyendo paciente actual.
- [x] 2.5 Mantener guardado no bloqueante salvo validaciones existentes.

## 3. Pruebas y verificacion

- [x] 3.1 Agregar prueba Playwright para advertencia en alta rapida.
- [x] 3.2 Agregar prueba Playwright para advertencia en ficha rapida.
- [x] 3.3 Ejecutar `npm.cmd run seed:test`.
- [x] 3.4 Ejecutar `npm.cmd run test:playwright:test`.
- [x] 3.5 Ejecutar `npm.cmd run build`.
- [x] 3.6 Ejecutar `npx.cmd openspec validate --all`.
