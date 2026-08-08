## Context

El release de escritorio `0.1.0` se construye con Next.js standalone y empaqueta ese runtime dentro de Electron. El árbol actual de `develop` usa `next@16.2.12`, PostCSS `8.5.14`, NanoID `3.3.11` y Sharp `0.34.5`. La auditoría de producción registra 4 vulnerabilidades altas; la auditoría completa registra 12 hallazgos, 10 altos y 2 moderados, incluyendo herramientas de build y escritorio.

El registro oficial de npm publica Next.js `16.3.0` como estable. Esa versión declara PostCSS `8.5.23` y Sharp `^0.35.3`, que superan los rangos vulnerables detectados. El proyecto ya cumple Node.js `>=20.9`, usa React 19.2, TypeScript 5, ESLint Flat Config y Turbopack, de acuerdo con la guía local de Next.js 16.

## Goals / Non-Goals

**Goals:**

- Actualizar `next` y `eslint-config-next` a `16.3.0` y resolver sus transitivas vulnerables.
- Eliminar el override de PostCSS y conservar un lockfile reproducible mediante `npm ci`.
- Lograr cero vulnerabilidades altas o críticas en producción.
- Resolver hallazgos altos o críticos de desarrollo cuando exista una actualización compatible sin ruptura.
- Demostrar compatibilidad mediante pruebas, TypeScript, ESLint, build standalone y empaquetado NSIS.

**Non-Goals:**

- Ejecutar `npm audit fix --force`, instalar versiones canary o imponer overrides fuera de los rangos oficiales.
- Actualizar todas las dependencias sólo porque exista una versión más reciente.
- Saltar a ESLint 10, TypeScript 7, tipos de Node 26 o PocketBase 0.27 dentro de este cambio.
- Sanear los 40 hallazgos preexistentes de lint; ese trabajo se especifica en `sanear-baseline-lint`.
- Modificar rutas, componentes clínicos, autorización, esquema de PocketBase o datos.

## Decisions

### Next.js 16.3.0 como actualización mínima segura

Se fijarán `next` y `eslint-config-next` en `16.3.0`. A diferencia de `16.2.12`, la versión estable nueva admite oficialmente Sharp `0.35.x` y un PostCSS corregido. Se descartan canaries y overrides manuales porque debilitarían la compatibilidad y reproducibilidad del runtime.

### Eliminación del override de PostCSS

El override raíz `postcss: 8.5.14` impide que npm seleccione el rango corregido declarado por Next.js. Se eliminará y se regenerará el lockfile con npm. El árbol efectivo deberá contener PostCSS `8.5.23` o posterior, Sharp `0.35.3` o posterior y NanoID posterior a `3.3.16`.

### Umbrales separados para runtime y herramientas

`npm audit --omit=dev` será bloqueante y deberá quedar sin hallazgos altos o críticos. La auditoría completa se tratará por separado: todo hallazgo alto o crítico con una corrección compatible deberá resolverse; cualquier remanente sin solución compatible se documentará con paquete, camino transitivo y exposición antes de decidir el release.

### Actualizaciones de tooling acotadas por riesgo

Se permitirán parches o menores compatibles necesarios para cerrar la auditoría, por ejemplo Tailwind/PostCSS `4.3.3`, Concurrently `10.0.4` y transitivas renovadas por npm. Los saltos mayores o dependencias de dominio no relacionadas quedan fuera para reducir superficie de regresión.

### Validación independiente de la deuda de lint

La actualización de `eslint-config-next` puede variar el conjunto de reglas. En este cambio se comparará el resultado completo contra el baseline de 11 errores y 29 advertencias y no se aceptarán regresiones. El baseline cero se alcanzará en el cambio separado de lint.

### Build desde dependencias locales al worktree

El worktree utilizará su propio `node_modules` instalado mediante `npm ci`. No se usarán junctions ni se alterará `next.config.ts` para ocultar problemas de raíz de Turbopack.

## Risks / Trade-offs

- [Next.js 16.3.0 cambia comportamiento interno de Turbopack o standalone] → Ejecutar pruebas, build completo e inspección del paquete antes de publicar.
- [Eliminar el override produce más de una versión de PostCSS] → Inspeccionar `npm ls` y auditar el árbol efectivo, no sólo `package.json`.
- [Una actualización transitiva de tooling altera el instalador] → Limitar cambios a versiones compatibles y probar el ejecutable empaquetado.
- [La auditoría completa conserva hallazgos sin parche compatible] → Documentar alcance y separar el criterio de runtime; no usar `--force` para ocultarlos.
- [El instalador incorpora una salida standalone incompleta] → Inspeccionar `resources/app`, PocketBase y los archivos de política de Electron.

## Migration Plan

1. Actualizar Next.js, su configuración ESLint y las dependencias compatibles necesarias; eliminar el override de PostCSS.
2. Regenerar `package-lock.json`, instalar desde cero con `npm ci` e inspeccionar versiones efectivas.
3. Ejecutar auditorías de producción y completa; corregir cualquier incumplimiento compatible.
4. Ejecutar pruebas focalizadas, TypeScript, comparación de lint y build standalone.
5. Generar e inspeccionar el instalador NSIS y probar sus servicios locales.
6. Integrar mediante pull request hacia `develop` y regenerar el artefacto final desde el commit fusionado.
7. Ante una regresión, no publicar el instalador y revertir el commit; no existen migraciones de datos que deshacer.

## Open Questions

Ninguna para iniciar la implementación.
