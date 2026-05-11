## Context

La gestion de turnos ya concentra alta, reprogramacion, cancelacion, acciones rapidas de estado, Agenda Diaria y Sala de espera. Varias acciones agregan notas en `observaciones`, pero esas notas mezclan informacion clinica/operativa con auditoria y no permiten reconstruir claramente quien hizo cada cambio.

El cambio introduce una coleccion de eventos de turno como bitacora append-only. La UI seguira actualizando `turnos` como fuente principal del estado actual, y escribira un evento asociado para cada accion relevante. Esto evita cambiar el modelo actual de turnos y mantiene el alcance chico.

## Goals / Non-Goals

**Goals:**

- Registrar eventos operativos por turno con tipo, detalle, usuario actor y fecha de creacion.
- Mostrar el historial dentro del modal de gestion del turno.
- Registrar automaticamente creacion, cambio de estado, cancelacion, reprogramacion y edicion operativa.
- Exigir motivo para estados sensibles iniciados desde secretaria: `Cancelado` y `Ausente`.
- Dejar el esquema reproducible mediante script/migracion y compatible con testing.

**Non-Goals:**

- No reemplazar `turnos.estado` como fuente del estado actual.
- No crear un modulo de auditoria general para todas las colecciones.
- No implementar reportes estadisticos todavia.
- No bloquear el flujo medico de consulta por ausencia de historial previo.
- No migrar notas historicas existentes de `observaciones` a eventos.

## Decisions

- **Nueva coleccion `turno_eventos`.** Alternativa considerada: guardar historial como JSON dentro de `turnos`. Se elige coleccion separada porque permite listar, ordenar, filtrar y crecer sin reescribir el turno completo.
- **Eventos append-only desde los flujos existentes.** Las acciones seguiran actualizando `turnos` y luego crearan un evento. Esto minimiza cambios y mantiene compatibilidad con la UI actual.
- **Campos simples y explicitos.** La coleccion tendra `turno_id`, `actor_id`, `actor_nombre`, `tipo`, `titulo`, `detalle`, `estado_anterior`, `estado_nuevo`, `fecha_hora_anterior`, `fecha_hora_nueva` y `metadata`. Los campos snapshot de actor permiten entender eventos aunque el usuario cambie de nombre o email.
- **Motivos sensibles fuera de observaciones como fuente principal.** Cancelaciones y ausencias deben guardar el motivo en el evento. Las observaciones pueden conservar notas visibles existentes, pero el historial sera la fuente de trazabilidad operativa.
- **Carga bajo demanda al abrir el modal.** El historial se consulta cuando se abre un turno, ordenado por `created` descendente o ascendente segun convenga visualmente. Esto evita cargar eventos de todos los turnos del dia de entrada.
- **Migracion reproducible por script.** Agregar un script `ensure_turno_eventos` o equivalente permite preparar produccion y testing sin depender de cambios manuales en PocketBase.

## Risks / Trade-offs

- **Operacion principal exitosa pero evento falla** -> Mostrar un error operativo y dejar logs de consola; la accion principal no deberia revertirse automaticamente en el cliente.
- **Reglas PocketBase demasiado abiertas** -> Definir reglas para usuarios autenticados con permisos de turnos y mantener la escritura limitada a eventos de turnos accesibles.
- **Historial incompleto para turnos viejos** -> Aceptar que el historial empieza desde la implementacion y mostrar un estado vacio claro.
- **Duplicacion con notas de observaciones** -> Mantener observaciones como texto libre y usar eventos para auditoria estructurada.
- **Produccion sin coleccion nueva** -> Ejecutar la migracion antes o junto al despliegue; la UI debe degradar con mensaje si no puede cargar historial.

## Migration Plan

- Crear la coleccion `turno_eventos` en PocketBase de testing y produccion mediante script reproducible.
- Actualizar el bootstrap de esquema de testing para copiar la nueva coleccion desde produccion cuando exista.
- Ejecutar seed/test de agenda y Playwright contra `.env.test.local`.
- Desplegar UI despues de confirmar que produccion ya tiene la coleccion.
- Rollback: si hubiese un problema, la UI puede dejar de escribir eventos sin alterar `turnos`; los eventos existentes permanecen como datos auxiliares.
