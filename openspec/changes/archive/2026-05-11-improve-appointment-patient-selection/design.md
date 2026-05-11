## Context

El formulario completo de nuevo turno ya permite crear pacientes y editar sus datos, mientras que el modal rapido de la agenda solo permite buscar y seleccionar pacientes existentes. Ambos flujos consultan PocketBase desde componentes cliente y ya usan patrones locales de busqueda con debounce.

## Goals / Non-Goals

**Goals:**
- Hacer que la busqueda encuentre pacientes por telefono ademas de nombre, apellido y documento.
- Mostrar mas datos en cada resultado para reducir seleccion equivocada.
- Llevar el alta rapida de paciente al modal de agenda.
- Mostrar advertencias de turnos existentes del paciente en la fecha seleccionada.

**Non-Goals:**
- No se cambia la coleccion `pacientes`.
- No se implementa deduplicacion automatica ni fusion de pacientes.
- No se agregan permisos nuevos.
- No se modifica impresion ni exportacion.

## Decisions

- Reutilizar el acceso directo a PocketBase desde las pantallas existentes para mantener el cambio acotado.
- Usar validacion de DNI/numero de documento antes de crear paciente, igual que el formulario completo actual.
- Consultar turnos del paciente por dia cuando exista paciente y fecha seleccionada; la advertencia sera informativa y no bloqueara la creacion.
- Mantener el modal rapido liviano con campos minimos de paciente: apellido, nombre, DNI, telefono y obra social.

## Risks / Trade-offs

- [Risk] La busqueda por telefono puede devolver coincidencias amplias si el dato esta incompleto. -> Mitigacion: mantener resultados limitados y mostrar contexto suficiente.
- [Risk] La advertencia de turnos del dia podria no cargar por una falla de red. -> Mitigacion: no bloquear el otorgamiento y registrar el error en consola.
- [Risk] Duplicacion temporal de UI entre modal rapido y formulario completo. -> Mitigacion: conservar patrones existentes y evitar una refactorizacion transversal en este paso.
