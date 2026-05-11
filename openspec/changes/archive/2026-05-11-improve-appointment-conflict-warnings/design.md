## Context

El flujo de secretaria ya permite buscar/crear paciente, seleccionar medico, fecha, disponibilidad y horario. Tambien muestra turnos existentes del paciente en la fecha seleccionada, pero aun no ofrece una vista de proximos turnos ni una confirmacion clara cuando se decide avanzar con advertencias.

## Goals / Non-Goals

**Goals:**
- Mostrar proximos turnos activos del paciente.
- Señalar coincidencias con el mismo medico.
- Pedir confirmacion explicita antes de guardar cuando haya advertencias.
- Conservar el flujo rapido sin navegacion adicional.

**Non-Goals:**
- No se bloquea la creacion por reglas administrativas nuevas.
- No se cambia el esquema de datos.
- No se implementa cupo maximo por medico en esta iteracion.

## Decisions

- Consultar los turnos activos del paciente desde los componentes cliente existentes, reutilizando PocketBase y `expand` de medico/paciente.
- Considerar activos los turnos que no estan en estados terminales: `Cancelado`, `Atendido` o `Ausente`.
- Mostrar las advertencias dentro del mismo modal/formulario y deshabilitar el guardado hasta que el usuario confirme haberlas revisado.
- Mantener los sobreturnos como caso visible con etiqueta y tipo, sin cambiar los valores guardados.

## Risks / Trade-offs

- [Risk] Las advertencias pueden agregar friccion cuando el paciente tiene turnos frecuentes. -> Mitigacion: solo exigir confirmacion cuando hay turnos activos relevantes.
- [Risk] La consulta de proximos turnos puede fallar por red. -> Mitigacion: registrar el error y permitir continuar sin bloquear.
- [Risk] Estados historicos no contemplados pueden quedar como activos. -> Mitigacion: usar una lista corta de estados terminales y tratar lo desconocido como activo.
