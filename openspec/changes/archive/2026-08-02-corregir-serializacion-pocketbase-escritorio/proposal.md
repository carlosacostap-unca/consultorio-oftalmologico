## Why

La activación de la aplicación de escritorio llega a descargar el usuario desde staging, pero PocketBase local rechaza las operaciones porque el cuerpo se envía como `[object Object]` en lugar de JSON. Esto impide crear y autenticar el usuario local, por lo que la primera configuración nunca puede completarse.

## What Changes

- Corregir la preparación de cabeceras del cliente PocketBase para conservar un formato compatible con la serialización automática del SDK.
- Garantizar que autenticaciones, altas y actualizaciones locales con cuerpos de objeto se envíen como JSON válido.
- Incorporar pruebas de regresión que detecten cabeceras incompatibles y cuerpos sin serializar antes de generar la aplicación de Windows.
- Mantener las restricciones de escritura y las cabeceras de dispositivo/actor existentes.
- Distinguir la copia inicial proveniente del servidor central para permitir sólo las altas y actualizaciones locales necesarias de mutuales por el cliente de PocketBase.
- Hacer idempotente la copia de usuarios mediante una consulta de existencia privilegiada y confinada al proceso principal de Electron.
- Copiar `system_settings` mediante un upsert privilegiado y confinado al proceso principal, sin relajar las reglas administrativas de PocketBase local.

## Capabilities

### New Capabilities

- `desktop-local-pocketbase-transport`: Define el transporte JSON y la identificación de dispositivo para solicitudes de la aplicación de escritorio hacia PocketBase local.

### Modified Capabilities

Ninguna.

## Impact

- Código afectado: cliente PocketBase, sincronización de escritorio, proceso principal/preload de Electron, alcance de escritorio y pruebas asociadas.
- Sistemas afectados: activación inicial, autenticación local y persistencia offline de la aplicación de escritorio.
- No requiere cambios de esquema, migración de datos ni modificaciones en PocketBase de staging.
