## 1. Preparacion

- [x] 1.1 Revisar docs locales de Next.js relevantes antes de tocar App Router.
- [x] 1.2 Revisar flujos actuales de alta, edicion, cambio de estado, cancelacion y reprogramacion de turnos.
- [x] 1.3 Definir tipos TypeScript y constantes de eventos de turno.

## 2. Esquema PocketBase

- [x] 2.1 Crear script reproducible para asegurar la coleccion `turno_eventos`.
- [x] 2.2 Ejecutar el script contra PocketBase de testing.
- [x] 2.3 Ejecutar el script contra PocketBase de produccion antes del despliegue.
- [x] 2.4 Verificar que `schema:test` incluya la nueva coleccion.

## 3. Registro de eventos

- [x] 3.1 Implementar helper para crear eventos con actor, tipo, titulo, detalle y datos previos/nuevos.
- [x] 3.2 Registrar evento al crear turno desde alta rapida, alta completa y sobreturno.
- [x] 3.3 Registrar evento al guardar edicion de motivo, observaciones o estado.
- [x] 3.4 Registrar evento al cancelar turno.
- [x] 3.5 Registrar evento al reprogramar turno.
- [x] 3.6 Registrar evento al cambiar estado desde acciones rapidas y selectores.

## 4. Interfaz de historial

- [x] 4.1 Cargar historial al abrir el modal de gestion del turno.
- [x] 4.2 Agregar seccion/pestana de historial operativo en el modal.
- [x] 4.3 Mostrar estados de carga, vacio y error de historial.
- [x] 4.4 Solicitar motivo obligatorio para marcar `Ausente` desde acciones rapidas.

## 5. Pruebas y verificacion

- [x] 5.1 Actualizar seed/helpers Playwright para consultar eventos de turno.
- [x] 5.2 Agregar prueba Playwright de cambio de estado con historial visible.
- [x] 5.3 Agregar prueba Playwright de ausente/cancelacion con motivo obligatorio.
- [x] 5.4 Ejecutar `npm.cmd run schema:test`.
- [x] 5.5 Ejecutar `npm.cmd run seed:test`.
- [x] 5.6 Ejecutar `npm.cmd run test:playwright:test`.
- [x] 5.7 Ejecutar `npm.cmd run build`.
- [x] 5.8 Ejecutar `npx.cmd openspec validate --all`.
