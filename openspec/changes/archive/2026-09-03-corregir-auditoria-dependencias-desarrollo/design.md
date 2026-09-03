## Context

Una instalación limpia de `develop` reproduce correctamente el proyecto y `npm audit --omit=dev` informa cero vulnerabilidades. Sin embargo, `npm audit` detecta dos hallazgos altos y dos moderados en dependencias transitivas exclusivas de herramientas de desarrollo, principalmente en las cadenas de ESLint, Babel y Electron Builder. npm informa correcciones compatibles disponibles, por lo que la política vigente bloquea la promoción hasta aplicarlas y validar el árbol resultante.

## Goals / Non-Goals

**Goals:**

- Resolver los hallazgos altos o críticos corregibles mediante una actualización compatible y reproducible del lockfile.
- Mantener el runtime de producción sin vulnerabilidades conocidas y repetir las verificaciones afectadas.
- Dejar evidencia suficiente para autorizar posteriormente la promoción de `develop` a `main`.

**Non-Goals:**

- No usar `npm audit fix --force`, adoptar versiones mayores deliberadas ni ampliar el alcance funcional.
- No modificar código clínico, APIs, permisos, esquemas de PocketBase, datos, semillas o importaciones.
- No generar, publicar o reemplazar instaladores ni modificar los punteros `pilot` y `stable`.

## Decisions

### Aplicar primero la corrección compatible calculada por npm

Se ejecutará `npm audit fix --package-lock-only` sin `--force` y se inspeccionará el diff antes de aceptar el resultado. Esto permite actualizar transitivas dentro de los rangos declarados y minimiza cambios de superficie. Como alternativa se consideró fijar manualmente cada transitiva mediante `overrides`, pero se descarta mientras la resolución normal de npm pueda producir un árbol corregido.

### Validar desde una instalación limpia

Después de actualizar el lockfile se ejecutará `npm ci`, seguido de las auditorías del runtime y del árbol completo. Esta secuencia comprueba que la solución no depende del estado previo de `node_modules` y que el lockfile es suficiente para reproducirla.

### Verificar las herramientas alcanzadas por las transitivas

Se ejecutarán lint, pruebas automatizadas, build de producción y verificaciones de empaquetado de escritorio aplicables. La actualización no autoriza publicar artefactos: sólo demuestra que las herramientas afectadas siguen funcionando.

## Risks / Trade-offs

- [Una transitiva corregida cambia el comportamiento de una herramienta] → Repetir lint, pruebas, build y verificaciones del empaquetado afectado sobre la instalación limpia.
- [npm propone una actualización mayor o requiere `--force`] → Detener la corrección automática, conservar el árbol actual y documentar la exposición para una decisión separada.
- [Persisten hallazgos moderados sin corrección compatible] → Documentarlos con su camino transitivo; no confundirlos con el umbral bloqueante alto/crítico.
- [El lockfile incluye cambios no relacionados] → Revisar el diff y limitar la actualización a las resoluciones necesarias.

## Migration Plan

1. Actualizar el lockfile en una rama dedicada y revisar las versiones resueltas.
2. Reinstalar con `npm ci` y ejecutar la barrera de seguridad y compatibilidad.
3. Integrar el cambio primero en `develop`; la promoción a `main` seguirá siendo una autorización separada.
4. Si aparece una regresión, revertir el commit del lockfile; no hay migración de datos ni rollback de esquema.

## Open Questions

Ninguna. Si npm no puede corregir los hallazgos sin ruptura, el caso volverá a evaluación antes de modificar rangos directos.
