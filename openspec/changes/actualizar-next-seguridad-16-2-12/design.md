## Context

El release de escritorio `0.1.0` se construye con Next.js standalone y empaqueta ese runtime dentro de Electron. `npm audit --omit=dev` detecta vulnerabilidades altas en `next@16.2.6` y sus dependencias transitivas PostCSS y Sharp. Next.js `16.2.12` corrige las alertas directas del framework, pero mantiene Sharp `^0.34.5`; npm exige Sharp `0.35.x` para corregir las alertas heredadas de libvips.

El proyecto ya utiliza Next.js 16, React 19.2, TypeScript 5 y Turbopack. La guía local de actualización de Next.js permite una actualización manual de dependencias; no se requiere codemod porque el cambio permanece dentro de la misma versión menor y no modifica APIs de la aplicación.

## Goals / Non-Goals

**Goals:**

- Actualizar `next` y `eslint-config-next` a la última versión estable publicada, `16.2.12`, y eliminar las alertas directas del framework.
- Mantener bloqueado el instalador mientras las dependencias incluidas en producción conserven vulnerabilidades altas o críticas.
- Conservar un lockfile reproducible y compatible con `npm ci`.
- Demostrar compatibilidad mediante pruebas, TypeScript, ESLint, build standalone y empaquetado NSIS.

**Non-Goals:**

- Actualizar React, Electron u otras dependencias sin relación con las alertas detectadas.
- Corregir en este cambio vulnerabilidades exclusivas de herramientas de desarrollo que no se empaquetan en el runtime.
- Modificar rutas, componentes, reglas de autorización, esquema de PocketBase o datos clínicos.
- Incorporar firma de código al instalador.

## Decisions

### Actualización inmediata del framework y bloqueo independiente del release

Se fijarán `next` y `eslint-config-next` en la última versión estable actual, `16.2.12`, porque corrige las alertas directas del framework y es compatible con React `19.2.5`. Esta actualización no habilita por sí sola el instalador: se descartan tanto una versión canary como un override de Sharp fuera del rango de Next.js, y el release seguirá bloqueado hasta contar con compatibilidad oficial.

### Lockfile regenerado por npm

La actualización se realizará con npm y versiones exactas para que `package.json` y `package-lock.json` describan el mismo árbol. Se descarta editar manualmente el lockfile porque impediría garantizar integridad y reproducibilidad.

### Umbral separado para runtime y herramientas

El criterio bloqueante será `npm audit --omit=dev`: no podrá reportar vulnerabilidades altas o críticas. La auditoría completa también se documentará, pero los hallazgos exclusivos de desarrollo se evaluarán por separado para no confundir herramientas de build con código distribuido.

### Build desde dependencias locales al worktree

Turbopack exige que `node_modules` permanezca dentro de la raíz del proyecto. El worktree de release utilizará `npm ci` local y no un junction hacia otro worktree. No se cambiará `next.config.ts` ni se desactivará Turbopack para ocultar ese problema de aislamiento.

## Risks / Trade-offs

- [La publicación estable compatible puede demorarse] → Mantener bloqueado el release y conservar la aplicación vigente hasta que exista una combinación soportada.
- [Una versión estable posterior puede cambiar el resultado del build] → Ejecutar pruebas focalizadas, TypeScript, ESLint y build completo antes de empaquetar.
- [El árbol transitivo puede conservar alertas de desarrollo] → Separar y documentar auditorías completa y `--omit=dev`; impedir el release sólo cuando el runtime incumpla el umbral.
- [El instalador puede incorporar una salida standalone incompleta] → Inspeccionar `resources/app`, PocketBase y los archivos de política de Electron dentro del paquete generado.
- [Windows puede advertir sobre un editor desconocido] → Entregar el instalador como no firmado y dejar la firma de código como trabajo posterior explícito.

## Migration Plan

1. Confirmar la última versión estable publicada de Next.js y actualizar `next` y `eslint-config-next` a `16.2.12`.
2. Validar la actualización del framework mediante instalación reproducible, pruebas, TypeScript, ESLint y build.
3. Regenerar `package-lock.json` e instalar mediante `npm ci`.
4. Ejecutar las auditorías y conservar bloqueado el release mientras Sharp incumpla el umbral.
5. Cuando exista compatibilidad oficial, generar el instalador NSIS `0.1.0`, inspeccionarlo y probar su arranque.
6. Publicar cada actualización revisada mediante pull request hacia `develop`; después de habilitar el release, regenerar el artefacto final desde el commit integrado.
7. Ante una regresión, no publicar el instalador y volver al commit anterior de `develop`; no hay migraciones de datos que revertir.

## Open Questions

- ¿Qué versión estable de Next.js será la primera en declarar compatibilidad con Sharp `0.35.x` o posterior corregido?
- La firma de código se tratará en un cambio independiente.
