## Context

La pantalla `/turnos` ya concentra lista, agenda semanal, agenda diaria y disponibilidades. La secretaria puede cambiar estados desde Agenda Diaria, pero esa vista mezcla agenda, slots y acciones de carga. Para el momento de recepcion del paciente conviene una vista separada y mas densa, orientada a estados operativos del dia.

La solucion debe reutilizar los datos ya cargados en `app/turnos/page.tsx`: turnos con paciente y medico expandidos, medicos agendables, fecha seleccionada y filtro por medico. No requiere cambios en PocketBase porque los estados necesarios ya existen en `turnos.estado`.

## Goals / Non-Goals

**Goals:**

- Agregar una pestana/vista "Sala de espera" dentro de Gestion de Turnos.
- Mostrar solo turnos del dia seleccionado, respetando medico seleccionado o `Todos los medicos`.
- Agrupar por estados operativos: proximos, en espera, en consulta, atendidos, ausentes y cancelados.
- Mostrar conteos, proximo turno y pacientes esperando para que secretaria pueda actuar rapido.
- Reutilizar acciones existentes de estado y gestion de turno.
- Mantener compatibilidad con el rol medico, aunque el valor principal sea para secretaria.

**Non-Goals:**

- No crear un modulo independiente fuera de `/turnos`.
- No agregar estados nuevos ni cambiar el esquema de `turnos`.
- No implementar temporizadores en tiempo real ni notificaciones push.
- No modificar el flujo medico de consulta en esta etapa.

## Decisions

- **Nueva opcion de vista en `ViewMode`.** Agregar `waiting-room` permite integrarla con los filtros existentes de fecha/medico y evita crear otra ruta prematuramente.
- **Derivar grupos en cliente.** La pagina ya carga todos los turnos relevantes y los filtra localmente. Agrupar en cliente mantiene el cambio chico y coherente con Agenda Diaria.
- **Clasificacion por estado existente.** `En espera` alimenta sala de espera; `En consulta`, `Atendido`, `Ausente` y `Cancelado` se muestran como grupos; los turnos sin estado o futuros quedan como proximos.
- **Acciones rapidas conservadoras.** Usar los mismos handlers actuales para cambiar estado y abrir gestion, evitando duplicar reglas de negocio.
- **Pruebas Playwright con datos demo.** Extender la suite para validar que secretaria ve sala de espera, puede marcar llegada y la tarjeta cambia de grupo.

## Risks / Trade-offs

- **Duplicacion visual con Agenda Diaria** -> Mantener Sala de espera centrada en pacientes/estados y dejar slots/alta rapida en Agenda Diaria.
- **Estados historicos o vacios** -> Clasificar estados desconocidos como proximos o pendientes, sin perder el turno.
- **Muchos medicos en el futuro** -> Respetar el selector de medico existente y mostrar medico en cada fila cuando se elige `Todos los medicos`.
- **Tests fragiles por texto de estado** -> Usar encabezados y botones con nombres estables como "Sala de espera", "En espera" y "Llego".
