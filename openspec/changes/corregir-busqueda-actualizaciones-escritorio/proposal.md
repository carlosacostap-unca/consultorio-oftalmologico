## Why

La aplicación de escritorio instalada conserva la URL central dentro de su activación cifrada, pero el actualizador sólo consulta variables de entorno que no existen al abrirla desde Windows. Como resultado, `Buscar actualizaciones` termina silenciosamente con autenticación requerida y el equipo piloto no puede descubrir una versión publicada.

## What Changes

- Resolver la URL central del actualizador desde la activación cifrada del equipo, manteniendo las variables de entorno sólo como configuración explícita prioritaria.
- Diferenciar la ausencia de sesión de la ausencia de configuración y registrar de forma sanitizada toda búsqueda manual o automática.
- Mostrar en la interfaz un resultado visible y accionable cuando la búsqueda no puede comenzar, falla o confirma que no hay una versión nueva.
- Cubrir con pruebas el arranque empaquetado sin variables de entorno y la respuesta del control de actualizaciones.
- No modificar PocketBase, los datos clínicos, el esquema de sincronización ni el canal estable.

## Capabilities

### New Capabilities

<!-- No se introducen capacidades nuevas. -->

### Modified Capabilities

- `desktop-offline-runtime`: la búsqueda de actualizaciones de un equipo activado debe reutilizar su configuración central persistida y siempre comunicar el resultado al usuario.

## Impact

- Runtime principal de Electron, puente IPC y control visual de actualizaciones.
- Estado cifrado de activación ya existente; no requiere migración ni nuevos secretos.
- Pruebas unitarias del cliente de actualizaciones y validaciones del empaquetado de escritorio.
- Sin cambios de API pública, dependencias, esquema PocketBase o importaciones legacy.
