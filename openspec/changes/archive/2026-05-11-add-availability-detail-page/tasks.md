## 1. Spec

- [x] 1.1 Documentar la pantalla de detalle de disponibilidad.

## 2. Availability List

- [x] 2.1 Quitar la columna de acciones de la tabla de disponibilidades.
- [x] 2.2 Hacer que las filas naveguen al detalle de disponibilidad.

## 3. Detail Page

- [x] 3.1 Crear `/turnos/disponibilidades/[id]`.
- [x] 3.2 Mostrar datos de la disponibilidad y turnos otorgados vinculados.
- [x] 3.3 Permitir editar fecha, hora inicio, hora fin y tipo.
- [x] 3.4 Permitir eliminar la disponibilidad desde el detalle.

## 4. Verification

- [x] 4.1 Ejecutar `npm.cmd run openspec:validate`.
- [x] 4.2 Ejecutar `npm.cmd run build`.
- [x] 4.3 Ejecutar lint enfocado en archivos tocados.

## 5. Read-only Detail Mode

- [x] 5.1 Mostrar el detalle inicialmente en modo lectura.
- [x] 5.2 Agregar `Editar` junto a `Eliminar`.
- [x] 5.3 Habilitar campos y `Guardar cambios` solo en modo edicion.
- [x] 5.4 Ejecutar validaciones enfocadas.

## 6. Assigned Appointments

- [x] 6.1 Listar como turnos otorgados los turnos vinculados a la disponibilidad.
- [x] 6.2 Ajustar el contador de turnos otorgados para incluir turnos vinculados sin paciente.
- [x] 6.3 Mostrar `Sin paciente asignado` cuando el turno no tenga relacion de paciente.
- [x] 6.4 Ejecutar validaciones enfocadas.

## 7. Availability Return Navigation

- [x] 7.1 Hacer que el detalle vuelva a `/turnos?tab=availability`.
- [x] 7.2 Hacer que `/turnos?tab=availability` active la pestaña Disponibilidades.
- [x] 7.3 Ejecutar validaciones enfocadas.
