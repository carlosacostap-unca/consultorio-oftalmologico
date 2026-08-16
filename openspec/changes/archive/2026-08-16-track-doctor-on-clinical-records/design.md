## Context

La aplicacion ya gestiona multiples medicos como usuarios con rol `medico`, turnos con `medico_id`, consultas clinicas y recetas. Hoy la trazabilidad clinica queda incompleta cuando una consulta o receta no conserva explicitamente el medico responsable: en algunos casos se puede inferir desde el turno, la sesion activa o la consulta vinculada, pero esa inferencia no queda guardada como dato clinico propio.

La solucion debe convivir con registros existentes importados o creados antes de este cambio y debe mantener flujos actuales para secretaria, admin y medico.

## Goals / Non-Goals

**Goals:**

- Registrar `medico_id` en `consultas` y `recetas`.
- Precargar el medico desde el contexto mas confiable: turno asociado, consulta vinculada, rol medico activo o seleccion manual.
- Mostrar el medico responsable en listados, detalle, impresion y ficha clinica del paciente.
- Proveer migracion idempotente de schema sin modificar datos historicos existentes.
- Permitir que usuarios autorizados completen manualmente el medico en registros historicos.
- Mantener compatibilidad con registros historicos sin medico registrado.

**Non-Goals:**

- No se cambia la regla clinica de quien puede atender o emitir recetas.
- No se implementa firma digital ni matricula profesional.
- No se modifica la agenda ni la asignacion de turnos fuera de usar `turnos.medico_id` como fuente de datos.
- No se infiere automaticamente medico para registros ya existentes.

## Decisions

1. `consultas.medico_id` y `recetas.medico_id` seran relaciones a `users`.
   - Rationale: el sistema ya representa a cada medico como usuario con rol `medico`, y los turnos usan la misma coleccion.
   - Alternative considered: guardar texto libre con nombre del medico. Se descarta porque rompe filtros, expansiones y cambios futuros de datos del usuario.

2. La atribucion se guarda como campo propio en cada registro clinico, no solo como inferencia visual.
   - Rationale: una receta libre o una consulta historica deben conservar medico responsable aunque cambie el turno o la sesion.
   - Alternative considered: inferir siempre desde `turno_id`, `consulta_id` o usuario creador. Se descarta porque no todos los registros tienen esas relaciones.

3. No habra backfill automatico sobre datos historicos.
   - Rationale: el usuario confirmo que los datos existentes no tienen una fuente confiable de que medico atendio.
   - Los registros historicos quedaran sin `medico_id` hasta que alguien los complete manualmente.

4. La UI permitira seleccion o correccion manual con reglas por rol.
   - Admin y secretaria pueden asignar cualquier usuario con rol medico.
   - Medico solo puede asignarse a si mismo.
   - Rationale: habilita saneamiento historico sin permitir que un medico atribuya registros a terceros.

## Risks / Trade-offs

- Registros historicos pueden quedar sin medico por un tiempo -> mostrar estado explicito y permitir correccion manual en edicion.
- Si una receta vinculada a consulta cambia de consulta, podria cambiar el medico sugerido -> recalcular solo al seleccionar consulta, pero no sobrescribir una seleccion manual sin avisar.
- Reglas PocketBase demasiado estrictas podrian romper importaciones o migraciones -> schema idempotente y scripts administrativos usan credenciales admin.

## Migration Plan

1. Agregar script idempotente `ensure_clinical_doctor_attribution`.
2. Agregar campos relation opcionales en `consultas` y `recetas`.
3. Actualizar UI/API para guardar y expandir `medico_id`.
4. Validar con build, OpenSpec y Playwright.
