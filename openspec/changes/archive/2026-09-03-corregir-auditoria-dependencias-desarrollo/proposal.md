## Why

La promoción de `develop` a producción está bloqueada porque la instalación limpia reporta dos vulnerabilidades altas en dependencias transitivas de las herramientas de desarrollo. La auditoría indica que existen correcciones compatibles, por lo que deben aplicarse y verificarse antes del release.

## What Changes

- Actualizar el árbol bloqueado de dependencias de desarrollo con correcciones compatibles, sin usar `npm audit fix --force` ni introducir actualizaciones mayores deliberadas.
- Confirmar que las dependencias de producción continúan sin vulnerabilidades conocidas y que el árbol completo no conserva hallazgos altos o críticos corregibles.
- Repetir la barrera reproducible del release sobre una instalación limpia, incluyendo lint, pruebas, build y las verificaciones afectadas del empaquetado de escritorio.
- Documentar cualquier hallazgo moderado residual y dejar sin cambios el comportamiento funcional, los datos, los esquemas de PocketBase y los canales de actualización de escritorio.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `production-dependency-security`: precisa que las correcciones compatibles de vulnerabilidades altas o críticas del árbol completo deben reflejarse en el lockfile y validarse mediante instalación limpia antes de autorizar una promoción.

## Impact

- Dependencias y lockfile de npm (`package.json` y/o `package-lock.json`, según lo requiera la resolución compatible).
- Herramientas de lint, build y empaquetado Electron que consumen las dependencias transitivas afectadas.
- Sin cambios de API, lógica clínica, migraciones, esquemas de PocketBase, semillas, importaciones ni artefactos o punteros de los canales `pilot` y `stable`.
