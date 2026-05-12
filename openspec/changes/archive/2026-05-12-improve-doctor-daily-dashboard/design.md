## Enfoque
La mejora se implementa dentro de la vista diaria existente de `app/turnos/page.tsx`, reutilizando los turnos ya cargados y filtrados por medico/fecha. Para evitar duplicar comportamiento, las acciones clinicas usan los handlers y rutas actuales.

## Decisiones
- El panel se muestra solo cuando `activeRole` es `medico`.
- Se calcula desde `dailyBaseTurnos`, porque la jornada clinica debe mostrar el contexto del dia aunque haya filtros visuales activos.
- El paciente en consulta prioriza turnos con estado `En consulta`.
- El proximo paciente prioriza turnos no terminales ordenados por hora.
- Las acciones principales son:
  - continuar/iniciar consulta mediante `handleConsultationAction`
  - abrir ficha clinica en `/pacientes/<id>?mode=view`
  - crear receta libre en `/recetas/nueva?paciente_id=<id>`

## Fuera de alcance
- No se modifica sala de espera ni agenda semanal.
- No se agregan permisos nuevos.
- No se cambian reglas de estados de turno.
