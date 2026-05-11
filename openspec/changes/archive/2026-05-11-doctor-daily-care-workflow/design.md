## Context

La secretaria ya puede preparar la jornada de los medicos desde turnos: agenda multi-medico, sala de espera, estados, sobreturnos, reprogramacion y ficha rapida. El medico hoy comparte gran parte de esa pantalla, pero necesita una entrada mas enfocada en atencion clinica: su agenda propia, sus pacientes del dia y acciones directas para iniciar o continuar consultas.

El primer bloque debe aprovechar `/turnos`, `/consultas/nueva` y `/consultas/[id]` existentes, sin crear un modulo clinico paralelo ni modificar el esquema PocketBase.

## Goals / Non-Goals

**Goals:**

- Dar al medico una vista diaria clara de sus turnos y estados clinicos.
- Permitir iniciar una consulta desde un turno, marcando el turno como `En consulta` cuando corresponda.
- Permitir continuar una consulta ya vinculada desde el turno.
- Mantener acceso rapido a ficha del paciente e historial reciente durante la atencion.
- Cubrir el flujo con Playwright sobre PocketBase de testing.

**Non-Goals:**

- Redisenar completo el formulario clinico de consultas.
- Cambiar reglas de permisos globales o administracion de usuarios.
- Crear nuevas colecciones PocketBase.
- Cambiar el flujo de secretaria para otorgar turnos.

## Decisions

- Reusar `/turnos` para el tablero diario del medico. Evita duplicar consultas a PocketBase y mantiene un unico origen visual para estados de agenda. Alternativa considerada: crear `/medico`; se descarta por ahora para no partir el modulo antes de estabilizar la experiencia.
- Filtrar por medico autenticado cuando el rol activo es `medico`. La UI puede mostrar el nombre del medico, pero no debe permitir seleccionar otros medicos. Esto respeta el comportamiento ya especificado para agenda propia.
- Hacer de Agenda Diaria o Sala de espera la entrada principal del medico. La implementacion podra elegir la pestaña inicial mas ergonomica, siempre que el medico vea primero sus turnos del dia y acciones clinicas.
- Iniciar consulta desde turno navegando a `/consultas/nueva?paciente_id=<id>&turno_id=<id>`. Si el turno ya tiene `consulta_id`, la accion principal navega a `/consultas/<id>`.
- Actualizar estado a `En consulta` al iniciar atencion cuando el turno todavia no esta atendido, cancelado o ausente. La consulta guardada conserva el comportamiento existente de marcar `Atendido`.

## Risks / Trade-offs

- Acciones repetidas sobre un turno con consulta existente -> La accion principal debe ser continuar/ver consulta y no crear otra consulta vinculada.
- Mezcla de controles de secretaria y medico -> La vista medico debe ocultar o degradar acciones administrativas que no aportan a la atencion diaria.
- Estados historicos con nombres inconsistentes -> Las condiciones deben convivir con estados existentes como `No llego`/`No llego` heredado y no romper listados.
- Flujo parcialmente cubierto por componentes grandes -> La implementacion debe mantener cambios acotados y validar con Playwright para evitar regresiones en secretaria.
