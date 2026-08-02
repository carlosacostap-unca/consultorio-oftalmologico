## 1. Dependencias corregidas

- [x] 1.1 Confirmar la última versión estable publicada y actualizar `next` y `eslint-config-next` a `16.2.12`.
- [x] 1.2 Regenerar `package-lock.json` con npm y comprobar que `npm ci` reconstruye el árbol en el worktree aislado.
- [x] 1.3 Confirmar las versiones efectivas de Next.js, PostCSS y Sharp instaladas.

## 2. Auditoría de seguridad

- [ ] 2.1 Ejecutar `npm audit --omit=dev` y verificar que no existan vulnerabilidades altas o críticas en producción.
- [x] 2.2 Ejecutar la auditoría completa y documentar por separado cualquier hallazgo exclusivo de herramientas de desarrollo.
- [x] 2.3 Mantener bloqueado el instalador hasta que Next.js estable admita oficialmente una versión corregida de Sharp.

## 3. Compatibilidad de la aplicación

- [x] 3.1 Ejecutar las pruebas focalizadas de sincronización y escritorio.
- [x] 3.2 Ejecutar TypeScript y ESLint focalizado sobre la versión actualizada y documentar el baseline del lint completo.
- [x] 3.3 Ejecutar el build de producción de Next.js y validar OpenSpec en modo estricto.

## 4. Instalador de Windows

- [ ] 4.1 Preparar y verificar PocketBase, luego generar el instalador NSIS `0.1.0` para Windows x64.
- [ ] 4.2 Inspeccionar que el paquete incluya Next.js standalone, PocketBase y los archivos vigentes de Electron sin URLs de staging.
- [ ] 4.3 Probar el arranque de la aplicación empaquetada y confirmar que sus servicios locales respondan correctamente.

## 5. Integración del release

- [ ] 5.1 Publicar la actualización revisada mediante un pull request hacia `develop`.
- [ ] 5.2 Tras la integración, regenerar el instalador final desde el commit fusionado y registrar su hash SHA-256.
