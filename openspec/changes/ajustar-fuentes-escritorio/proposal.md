## Why

Los usuarios de Windows necesitan adaptar la lectura de toda la aplicación a su visión y pantalla mediante el teclado, sin modificar cada sección.

## What Changes

- Ctrl + «+» aumenta las fuentes y Ctrl + «−» las disminuye, incluidos los signos del teclado numérico.
- Ctrl + 0 restaura el tamaño predeterminado. Ajustes de 10 puntos porcentuales entre 80% y 200% del tamaño actual.
- La preferencia se conserva por perfil de Windows entre reinicios y actualizaciones; no afecta impresión ni versión web.

## Capabilities

### New Capabilities
- `desktop-font-scaling`: Ajuste persistente de tipografía con atajos en Windows.

### Modified Capabilities

Ninguna.

## Impact

Electron, preload, proveedor global de escritorio, CSS y lista de archivos empaquetados. Sin dependencias nuevas, migraciones, cambios en PocketBase, permisos clínicos ni importaciones. La distribución requiere una nueva versión de escritorio.
