## Why

Los administradores necesitan recuperar los respaldos de la base central desde la aplicación web y Windows sin acceder a la consola de infraestructura. Los backups ya se guardan en S3 mediante PocketBase.

## What Changes

- Nueva opción «Backups» exclusiva del rol activo administrador, con fecha, tamaño, tipo y descarga individual.
- Listado real de todos los archivos disponibles, más recientes primero. La configuración observada conserva 30 automáticos diarios; los manuales también se muestran.
- Descarga directa desde storage mediante una URL firmada breve para un único archivo, generada después de verificar permisos en el servidor.
- En Windows se requiere Internet y una sesión central del mismo usuario local. Las credenciales de storage permanecen en el servidor web.

## Capabilities

### New Capabilities
- `admin-backup-downloads`: Listado y descarga directa de respaldos centrales para administradores en web y Windows.

### Modified Capabilities

Ninguna; se amplía la lista de rutas de escritorio con una función administrativa de lectura online.

## Impact

Página `/backups`, APIs centrales, menú, autorización, bridge Electron y pruebas. Se reutiliza el SDK S3 ya instalado y la API de backups de PocketBase. Sin migraciones, restauraciones, creación/eliminación de backups ni cambios de retención. La descarga requiere credenciales S3 de lectura en Dokploy; no se incluyen en el instalador.
