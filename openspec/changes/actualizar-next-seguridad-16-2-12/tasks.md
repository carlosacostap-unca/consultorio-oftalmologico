## 1. Dependencias corregidas

- [x] 1.1 Actualizar `next` y `eslint-config-next` a `16.3.0` y eliminar el override raíz de PostCSS `8.5.14`.
- [x] 1.2 Actualizar sólo las dependencias de tooling necesarias para resolver hallazgos mediante versiones compatibles, sin saltos mayores no relacionados.
- [x] 1.3 Regenerar `package-lock.json` con npm y comprobar que `npm ci` reconstruye el árbol en el worktree aislado.
- [x] 1.4 Confirmar con `npm ls` Next.js `16.3.0`, PostCSS `8.5.23` o posterior, Sharp `0.35.3` o posterior y NanoID posterior a `3.3.16`.

## 2. Auditoría de seguridad

- [x] 2.1 Ejecutar `npm audit --omit=dev` y verificar cero vulnerabilidades altas o críticas en producción.
- [x] 2.2 Ejecutar la auditoría completa y resolver los hallazgos altos o críticos con corrección compatible.
- [x] 2.3 Documentar cualquier hallazgo de desarrollo sin corrección compatible, incluido su camino transitivo y exposición. No quedaron hallazgos residuales.
- [x] 2.4 Confirmar que no se usaron versiones canary, overrides incompatibles ni `npm audit fix --force`.

## 3. Compatibilidad de la aplicación

- [x] 3.1 Ejecutar las pruebas focalizadas de sincronización y escritorio.
- [x] 3.2 Ejecutar TypeScript y comparar el lint completo contra el baseline de 11 errores y 29 advertencias sin aceptar regresiones.
- [x] 3.3 Ejecutar el build de producción de Next.js y comprobar la salida standalone.
- [x] 3.4 Validar los cambios OpenSpec en modo estricto.

## 4. Instalador de Windows

- [x] 4.1 Preparar y verificar PocketBase, luego generar el instalador NSIS `0.1.0` para Windows x64.
- [x] 4.2 Inspeccionar que el paquete incluya Next.js standalone, PocketBase y los archivos vigentes de Electron sin URLs de staging.
- [x] 4.3 Probar el arranque de la aplicación empaquetada y confirmar que sus servicios locales respondan correctamente.

## 5. Integración del release

- [x] 5.1 Publicar la actualización revisada mediante un pull request hacia `develop`.
- [ ] 5.2 Tras la integración, regenerar el instalador final desde el commit fusionado y registrar su hash SHA-256.
