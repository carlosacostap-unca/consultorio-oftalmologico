## Context

La secretaria puede abrir un modal de alta rapida desde slots libres u ocupados de Agenda Diaria. El modal ya crea turnos, permite crear paciente minimo, detecta turnos activos del paciente y soporta sobreturnos, pero la informacion queda dispersa: el contexto del turno esta en una linea secundaria, la seleccion de paciente no queda suficientemente destacada y la confirmacion posterior al guardado es implicita.

El cambio debe mejorar la experiencia operativa dentro de `/turnos` sin modificar el esquema PocketBase ni duplicar el flujo completo de `/turnos/nuevo`.

## Goals / Non-Goals

**Goals:**

- Hacer visible el contexto critico del turno antes de guardar: medico, fecha, hora, tipo, duracion inicial y disponibilidad.
- Diferenciar claramente turno regular y sobreturno, incluyendo el turno ocupado de referencia cuando exista.
- Mejorar la busqueda y seleccion de paciente con estados claros: buscando, sin resultados, paciente seleccionado y nuevo paciente.
- Mantener advertencias de paciente con turnos activos y hacer explicita la confirmacion requerida para guardar.
- Mostrar confirmacion de guardado y mantener la agenda diaria actualizada sin salir de `/turnos`.
- Cubrir el flujo con Playwright contra PocketBase de testing.

**Non-Goals:**

- No rediseñar el formulario completo de `/turnos/nuevo`.
- No crear nuevas colecciones ni campos PocketBase.
- No cambiar las reglas de permisos de secretaria, medico o admin.
- No implementar reglas complejas de especialidad, consultorio fisico o multiples sedes.

## Decisions

- **Mantener el modal dentro de `app/turnos/page.tsx`.** El estado actual de agenda, disponibilidades, turnos y medicos ya vive en esa pantalla. Extraer componentes antes de estabilizar el flujo agregaria movimiento innecesario.
- **Agregar una banda de contexto estructurada dentro del modal.** En vez de depender de una frase secundaria, se mostraran bloques escaneables con medico, fecha, hora, tipo, modo y disponibilidad. Esto reduce errores de carga en un contexto de atencion rapida.
- **Usar el estado existente de `QuickAppointmentState`.** La mejora debe apoyarse en `quickAppointment`, `quickPatientDayAppointments`, `quickWarningsAcknowledged` y `quickNewPatient`, agregando solo estado local minimo si hace falta para confirmacion visual.
- **Mantener la validacion en cliente.** El flujo actual usa PocketBase directo desde cliente para crear paciente y turno. Esta iteracion mejora la seguridad operativa de la UI sin introducir una nueva API server-side.
- **Playwright como contrato de comportamiento.** Las pruebas deben verificar textos/roles estables del modal: contexto visible, paciente seleccionado, advertencias y confirmacion. Esto protege el flujo de secretaria sin depender de detalles visuales fragiles.

## Risks / Trade-offs

- **Modal demasiado cargado** -> Usar grupos compactos y jerarquia visual clara, evitando texto explicativo redundante.
- **Selectores Playwright fragiles** -> Preferir nombres visibles estables como "Resumen del turno", "Paciente seleccionado" y "Turno creado".
- **Datos stale tras guardar** -> Actualizar `turnos` localmente como hoy y mostrar confirmacion basada en el registro creado antes de cerrar o limpiar el modal.
- **Advertencias bloquean de mas** -> Mantener el bloqueo solo cuando existan turnos activos detectados para el paciente y permitir confirmacion explicita.
