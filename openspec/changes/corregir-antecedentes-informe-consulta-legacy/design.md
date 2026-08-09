## Context

La vista de revisión de una consulta ya normaliza los antecedentes mediante `mergeClinicalAntecedents(consulta, paciente)`. Ese contrato conserva valores verdaderos históricos de la consulta, incorpora enfermedades de base activas en la ficha actual y prioriza `ant_otra` de la consulta cuando tiene contenido. El informe `/consultas/[id]/imprimir` carga al paciente expandido, pero calcula sus etiquetas únicamente desde la consulta; por eso una consulta legacy sin banderas propias puede imprimir “Sin antecedentes activos” mientras la pantalla clínica muestra Diabetes u otro antecedente.

El cambio afecta presentación clínica imprimible y debe conservar autenticación, permisos y atribución médica existentes. No requiere una consulta adicional: el paciente ya se obtiene mediante `expand: "paciente_id,medico_id"`.

## Goals / Non-Goals

**Goals:**

- Usar una única regla de resolución de antecedentes en la revisión y en el informe clínico.
- Mostrar enfermedades de base del paciente en informes de consultas legacy incompletas.
- Conservar antecedentes históricos verdaderos registrados en la consulta y la prioridad existente de `ant_otra`.
- Cubrir la regresión con pruebas automatizadas sin escribir datos en producción.

**Non-Goals:**

- Modificar registros existentes de `consultas` o `pacientes`.
- Cambiar el esquema o las reglas de PocketBase.
- Redefinir la semántica de `mergeClinicalAntecedents`.
- Cambiar la impresión de receta de anteojos o la historia clínica completa del paciente.

## Decisions

### Reutilizar el combinador clínico existente

El informe llamará a `mergeClinicalAntecedents(consulta, paciente)` antes de transformar el resultado en etiquetas imprimibles. Esto evita duplicar la regla de precedencia y garantiza coherencia con la revisión de consulta. Se descarta implementar otra combinación local porque volvería a permitir divergencias entre pantallas.

### Aprovechar el paciente ya expandido

Se ampliará el tipo imprimible del paciente para incluir los campos de antecedentes y se utilizará `consulta.expand?.paciente_id`. No se agregará una segunda solicitud a PocketBase, lo que mantiene el tiempo de carga y el modelo de autorización actuales.

### Mantener separadas resolución y presentación

La combinación seguirá siendo responsabilidad de `lib/clinical-antecedents.ts`; la página imprimible sólo convertirá el resultado normalizado en las etiquetas visibles. Las pruebas unitarias cubrirán el contrato de combinación y una prueba de la vista imprimible verificará el escenario legacy completo.

## Risks / Trade-offs

- [La ficha actual del paciente puede agregar un antecedente a un informe de una consulta antigua] → Es el comportamiento deliberado ya usado por la revisión clínica; los valores verdaderos históricos de la consulta también se conservan.
- [Una futura página podría volver a implementar la lista manualmente] → Centralizar la combinación y agregar una regresión de impresión hace visible esa divergencia en las verificaciones.
- [Datos expandidos ausentes por permisos o registros incompletos] → El combinador acepta paciente nulo y mantiene el comportamiento basado en la consulta sin impedir la impresión.

## Migration Plan

1. Actualizar el informe para consumir el paciente expandido y el combinador existente.
2. Ejecutar pruebas unitarias, lint, TypeScript y la regresión de impresión contra un entorno de testing o staging autorizado.
3. Desplegar sin migraciones ni escrituras de datos y realizar un smoke test de sólo lectura.
4. Ante una regresión, revertir el cambio de presentación; no existe migración de datos que deshacer.

## Open Questions

Ninguna para este alcance.
