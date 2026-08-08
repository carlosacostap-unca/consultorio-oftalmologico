## Context

`npm run lint` analiza actualmente toda la base con la configuración plana de ESLint 9, `core-web-vitals` y las reglas TypeScript de Next.js. El baseline medido sobre `develop` contiene 40 hallazgos: 11 errores y 29 advertencias. Los errores se concentran en usos de `any` y una variable reservada en una prueba; las advertencias incluyen dependencias incompletas de hooks, variables sin uso y un elemento `<img>`.

Las dependencias de hooks aparecen en pantallas con carga de pacientes, consultas, turnos, recetas y agenda. Agregar dependencias de forma automática puede provocar recargas, ciclos o pérdida de estado; omitirlas puede conservar cierres obsoletos. Por eso este saneamiento requiere decisiones por caso y pruebas focalizadas.

## Goals / Non-Goals

**Goals:**

- Lograr que el análisis completo termine con cero errores y cero advertencias.
- Hacer que las advertencias futuras bloqueen el comando de lint.
- Sustituir tipos inseguros por contratos de dominio o `unknown` con narrowing.
- Resolver dependencias de hooks sin introducir ciclos ni cambios de comportamiento.
- Conservar los flujos clínicos, administrativos, de sincronización y escritorio.

**Non-Goals:**

- Desactivar globalmente reglas de ESLint o excluir archivos actualmente analizados para reducir el contador.
- Rediseñar pantallas, cambiar APIs o alterar permisos, persistencia o esquemas.
- Actualizar dependencias; la actualización de Next.js y seguridad se mantiene en un cambio separado.
- Corregir problemas no reportados por el baseline salvo que sean necesarios para preservar el comportamiento.

## Decisions

### Cero advertencias como barrera explícita

El script de lint utilizará `eslint --max-warnings=0`. Se descarta depender del comportamiento predeterminado de ESLint, porque un comando exitoso con advertencias permitiría volver a acumular deuda.

### Correcciones tipadas en lugar de supresiones

Los `any` se reemplazarán por tipos existentes de registros, tipos locales mínimos o `unknown` con validación. La variable `module` de la prueba se renombrará. Se descartan comentarios `eslint-disable` y relajaciones globales como mecanismo para cerrar el baseline.

### Revisión semántica de hooks por categoría

Cada advertencia de `exhaustive-deps` se resolverá mediante una de estas opciones: mover lógica dentro del efecto, estabilizar callbacks con `useCallback`, derivar valores con `useMemo`, utilizar actualizaciones funcionales o incluir la dependencia cuando su identidad ya sea estable. La elección se validará contra la intención del flujo y no mediante inserción automática de dependencias.

### Entregas por lotes verificables

La implementación se dividirá en: errores bloqueantes, hooks, y advertencias restantes. Después de cada lote se ejecutarán lint, TypeScript y pruebas focalizadas de los dominios tocados. El build completo se ejecutará con el baseline ya limpio.

### Imagen optimizada sin cambio visual

El `<img>` señalado se migrará a `next/image` con dimensiones y comportamiento equivalentes. Se descarta desactivar `@next/next/no-img-element`; cualquier incompatibilidad con el build standalone deberá resolverse preservando el recurso y la presentación actuales.

## Risks / Trade-offs

- [Una dependencia agregada a un hook crea un ciclo de solicitudes o renderizados] → Estabilizar la función o moverla al efecto y validar el flujo afectado en navegador o prueba focalizada.
- [Un tipo demasiado estrecho rechaza datos históricos de PocketBase] → Usar contratos parciales y narrowing de `unknown` en los límites de datos.
- [Eliminar una variable aparentemente sin uso cambia una desestructuración con efectos laterales] → Revisar el origen y conservar explícitamente cualquier llamada necesaria.
- [El modo estricto bloquea contribuciones posteriores por una advertencia menor] → Mantener cero advertencias como política intencional y resolverlas en el mismo cambio que las introduce.
- [Cambios transversales dificultan localizar una regresión] → Implementar y verificar por lotes pequeños antes del build final.

## Migration Plan

1. Registrar el baseline exacto y cambiar el script para bloquear advertencias.
2. Corregir los 11 errores y ejecutar lint, TypeScript y pruebas relacionadas.
3. Resolver las advertencias de hooks por dominio y verificar cada flujo afectado.
4. Corregir variables sin uso y la imagen pendiente.
5. Ejecutar lint completo, TypeScript, pruebas focalizadas y build de producción.
6. Integrar mediante pull request hacia `develop`; no hay migraciones de datos ni pasos operativos en producción.
7. Ante una regresión, revertir el lote afectado; no se requiere rollback de esquema o datos.

## Open Questions

Ninguna para iniciar la implementación.
