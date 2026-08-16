## Context

Hoy la agenda se apoya en disponibilidades puntuales. Ese modelo funciona, pero obliga a crear manualmente bloques repetidos. Los medicos propusieron trabajar al reves: agenda semanal preconfigurada y bloqueos como excepciones. Esto se parece mas a una agenda real de consultorio: lo normal esta dado por regla, lo excepcional se carga cuando ocurre.

## Goals / Non-Goals

**Goals:**
- Definir horarios semanales recurrentes por medico.
- Soportar reglas separadas para `Consulta`, `Estudio` y `Cirugia`.
- Generar horarios disponibles desde reglas recurrentes.
- Registrar bloqueos por medico y bloqueos generales del consultorio.
- Permitir bloqueos aunque existan turnos otorgados.
- Detectar y mostrar turnos en conflicto.
- Agregar bandeja operativa de `Turnos a resolver`.
- Mantener una migracion gradual desde disponibilidades puntuales.

**Non-Goals:**
- No eliminar `disponibilidades` en la primera etapa.
- No implementar fecha de vigencia de horarios semanales.
- No resolver automaticamente turnos en conflicto.
- No cambiar duraciones historicas de turnos ya otorgados.

## Decisions

- Crear una coleccion `agenda_semanal_medico` para reglas recurrentes:
  - `medico_id`
  - `dia_semana`
  - `hora_inicio`
  - `hora_fin`
  - `tipo`
  - `duracion_minutos`
  - `activo`
- Crear una coleccion `bloqueos_agenda` para excepciones:
  - `alcance`: `general` o `medico`
  - `medico_id` opcional
  - `fecha_inicio`
  - `fecha_fin`
  - `hora_inicio` opcional
  - `hora_fin` opcional
  - `dia_completo`
  - `motivo`
  - `creado_por`
- Un bloqueo general aplica a todos los medicos y todos los tipos de atencion.
- Un bloqueo por medico aplica solo a ese medico.
- Admin y secretaria pueden administrar reglas y bloqueos de cualquier medico.
- El medico puede crear bloqueos solo para su propio usuario medico.
- Los conflictos se calculan dinamicamente al comparar turnos otorgados contra bloqueos vigentes.
- El turno no necesita guardar `tiene_conflicto` en esta etapa; asi, si se edita o elimina el bloqueo, el conflicto se actualiza solo.
- La agenda diaria y el alta de turnos deben combinar dos fuentes durante transicion:
  - reglas recurrentes nuevas
  - disponibilidades puntuales existentes, hasta que se decida ocultarlas o migrarlas

## Risks / Trade-offs

- [Mayor complejidad de calculo de slots] -> Centralizar helpers para generar slots y detectar bloqueos.
- [Conflictos no persistidos] -> El calculo dinamico evita datos stale, pero requiere buena cobertura de tests.
- [Convivencia con disponibilidades antiguas] -> Mantener compatibilidad transitoria reduce riesgo, aunque temporalmente haya dos modelos.
- [Bloqueos sobre turnos otorgados] -> La bandeja `Turnos a resolver` debe hacer visible el problema para que secretaria o medico lo subsanen.

## Migration Plan

1. Agregar schema de horarios semanales y bloqueos.
2. Crear pantallas administrativas de horarios medicos y bloqueos.
3. Generar slots desde reglas recurrentes en agenda diaria y alta de turnos.
4. Detectar conflictos dinamicamente.
5. Agregar bandeja `Turnos a resolver`.
6. Mantener disponibilidades actuales visibles durante validacion.
7. En una etapa posterior, decidir si se ocultan o migran disponibilidades puntuales.

## Open Questions

- Definir si los bloqueos parciales de varios dias deben permitir una misma franja horaria repetida por dia o si se cargan como dia completo/rango continuo.
- Definir si la bandeja de conflictos debe permitir reprogramar masivamente en una etapa posterior.
