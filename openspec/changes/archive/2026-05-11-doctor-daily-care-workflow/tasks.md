## 1. Preparacion

- [x] 1.1 Revisar docs locales de Next.js relevantes para paginas App Router usadas por turnos y consultas.
- [x] 1.2 Revisar el comportamiento actual de `/turnos`, `/consultas/nueva` y pruebas Playwright de medico.

## 2. Experiencia diaria del medico

- [x] 2.1 Ajustar `/turnos` para que el rol `medico` entre a una vista diaria o sala de espera centrada en su agenda.
- [x] 2.2 Mostrar resumen de turnos del dia con estados clinicos y pacientes que requieren accion.
- [x] 2.3 Asegurar que el medico no pueda seleccionar otros medicos ni `Todos los medicos`.
- [x] 2.4 Priorizar acciones de ficha, iniciar consulta y continuar consulta en los turnos del medico.

## 3. Inicio y continuidad de consulta

- [x] 3.1 Implementar accion de iniciar atencion desde turno y marcarlo como `En consulta` cuando corresponda.
- [x] 3.2 Dirigir a la consulta existente cuando el turno ya tenga `consulta_id`.
- [x] 3.3 Verificar que guardar consulta desde turno mantiene el vinculo y marca `Atendido`.

## 4. Pruebas y verificacion

- [x] 4.1 Actualizar o agregar prueba Playwright para jornada diaria del medico.
- [x] 4.2 Ejecutar `npm.cmd run seed:test`.
- [x] 4.3 Ejecutar `npm.cmd run test:playwright:test`.
- [x] 4.4 Ejecutar `npm.cmd run build`.
- [x] 4.5 Ejecutar `npx.cmd openspec validate --all`.
