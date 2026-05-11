## Context

La agenda ya soporta multiples medicos mediante `medico_id` en `disponibilidades` y `turnos`, y la secretaria puede seleccionar `Todos los medicos` o un medico puntual en `/turnos`. Sin embargo, el alta de turno sigue centrada en un formulario largo: primero se elige paciente y luego se completa fecha/disponibilidad. Para la secretaria, el trabajo real empieza por agenda: medico, dia, bloque disponible, horario libre y recien despues paciente.

## Goals / Non-Goals

**Goals:**

- Convertir el otorgamiento de turno en un flujo guiado desde `/turnos/nuevo`.
- Priorizar la seleccion de medico y fecha antes que paciente.
- Mostrar una grilla de horarios para la disponibilidad elegida con estados libre/ocupado.
- Permitir sobreturno de forma explicita cuando se elige un horario ocupado o fuera del bloque.
- Mantener alta rapida y edicion rapida de paciente dentro del flujo.
- Agregar pruebas automatizadas Playwright para roles y recorrido de secretaria.

**Non-Goals:**

- No se implementa motor avanzado de reglas por especialidad o consultorio fisico.
- No se cambia la duracion historica de consulta por defecto salvo que el formulario ya la use.
- No se reemplaza toda la vista semanal/diaria por un calendario nuevo.

## Decisions

### Flujo guiado en la pagina existente

Se modificara `/turnos/nuevo` en vez de crear una ruta nueva. Esto conserva enlaces actuales desde agenda, disponibilidad y sobreturno, y reduce cambios de navegacion.

Alternativa considerada: crear `/turnos/asignar`. Se descarta por duplicar logica de paciente, disponibilidad, sobreturno y guardado.

### Selector de horario derivado de disponibilidad

Cuando hay medico, fecha y disponibilidad, la UI calculara intervalos usando la duracion seleccionada. Cada intervalo se mostrara como libre u ocupado segun turnos existentes del mismo medico y dia.

Alternativa considerada: depender solamente del select de disponibilidad y campo de hora manual. Se mantiene como respaldo, pero el flujo principal debe evitar que la secretaria calcule horarios mentalmente.

### Validaciones en cliente con persistencia actual

La primera implementacion mantendra persistencia directa con PocketBase desde cliente, respetando los controles existentes. Las validaciones de solapamiento se haran antes de crear el turno y se reforzaran en la UI; una API transaccional puede agregarse luego si aparecen conflictos por concurrencia.

Alternativa considerada: crear endpoint `/api/turnos` con validacion central. Es mejor a largo plazo, pero aumenta alcance. Se deja como mejora futura si las pruebas muestran necesidad.

### Datos demo y Playwright

Se usaran usuarios demo existentes y se agregaran datos demo de agenda solo si faltan. Las pruebas Playwright deben poder ejecutarse repetidamente sin depender de datos creados por una corrida anterior.

## Risks / Trade-offs

- [Riesgo] Dos secretarias podrian crear turnos simultaneos en el mismo horario. → Mitigacion: recargar turnos antes de guardar y marcar claramente horarios ocupados; dejar anotado endpoint transaccional futuro.
- [Riesgo] La grilla de horarios podria saturarse si un bloque es muy largo o la duracion es pequena. → Mitigacion: usar botones compactos y agrupar por disponibilidad seleccionada.
- [Riesgo] Datos existentes sin `medico_id` o `disponibilidad_id` no apareceran en el flujo guiado. → Mitigacion: mantener vista lista y scripts de normalizacion.
- [Riesgo] Sobreturnos pueden confundirse con horarios libres. → Mitigacion: estilo y confirmacion explicita para crear sobreturno.
