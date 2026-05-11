## 1. Preparacion

- [x] 1.1 Revisar docs locales de Next.js para paginas cliente con `useSearchParams`.
- [x] 1.2 Revisar formulario actual de `/consultas/nueva` y prueba Playwright del flujo medico.

## 2. UI de nueva consulta

- [x] 2.1 Agregar resumen visible del paciente seleccionado.
- [x] 2.2 Mostrar contexto de turno cuando la consulta viene desde `turno_id`.
- [x] 2.3 Reorganizar el formulario en secciones clinicas escaneables.
- [x] 2.4 Mostrar resumen de antecedentes activos.
- [x] 2.5 Mantener todos los campos actuales y el calculo ADD.

## 3. Flujo y pruebas

- [x] 3.1 Validar que guardar desde turno mantiene `consulta_id` y estado `Atendido`.
- [x] 3.2 Ejecutar `npm.cmd run seed:test`.
- [x] 3.3 Ejecutar `npm.cmd run test:playwright:test`.
- [x] 3.4 Ejecutar `npm.cmd run build`.
- [x] 3.5 Ejecutar `npx.cmd openspec validate --all`.
