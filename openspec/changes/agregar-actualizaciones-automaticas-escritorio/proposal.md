## Why

La aplicación de escritorio ya puede instalarse y actualizarse manualmente conservando los datos locales, pero cada nueva versión todavía obliga al cliente a conseguir y ejecutar otro instalador. Se necesita una instalación inicial única y un mecanismo de actualización dentro de la propia aplicación que reduzca la intervención del usuario sin poner en riesgo la base clínica local.

## What Changes

- Incorporar detección periódica de versiones, descarga en segundo plano y una notificación con las acciones `Reiniciar y actualizar` y `Más tarde`.
- Conservar iDrive e2 como almacenamiento privado y exponer las descargas mediante una puerta de actualización en la aplicación central desplegada con Dokploy, autorizada sólo para equipos de escritorio activados.
- Publicar versiones de escritorio únicamente mediante una etiqueta explícita `desktop-v<semver>`, después de superar build, pruebas, empaquetado y verificaciones de integridad.
- Introducir canales `pilot` y `stable` para probar cada versión primero en un equipo y habilitarla después para las restantes instalaciones.
- Diferenciar actualizaciones normales, que pueden posponerse, de actualizaciones obligatorias, que permiten terminar el trabajo en curso pero deben aplicarse antes de continuar en un inicio posterior.
- Crear una copia de seguridad consistente de la base local, identidad, secretos operativos y estado de sincronización antes de instalar; abortar la actualización si el respaldo no puede verificarse.
- Verificar manifiesto y artefactos mediante hashes y una firma criptográfica propia antes de ejecutar un instalador descargado. Esta firma no reemplaza un certificado comercial de Windows ni elimina las advertencias de SmartScreen del instalador inicial.
- Mantener Windows 11 x64 como plataforma inicial soportada y rechazar de forma explicativa arquitecturas incompatibles.
- Compatibilizar de forma aditiva los registros técnicos `sync_devices` existentes con el contrato nuevo, preservando temporalmente ambos juegos de campos sin modificar contenido clínico.

## Capabilities

### New Capabilities

- `desktop-update-distribution`: Publicación deliberada, almacenamiento privado, puerta autorizada, canales, política de obligatoriedad e integridad de las versiones de escritorio.

### Modified Capabilities

- `desktop-offline-runtime`: La actualización manual sobre la instalación existente pasa a una experiencia automática con descarga, aviso, respaldo, reinicio controlado y conservación verificable de los datos locales.

## Impact

- Proceso principal y preload de Electron, interfaz de estado de actualización y ciclo ordenado de cierre de Next.js/PocketBase local.
- Configuración NSIS/electron-builder, nueva dependencia de actualización y scripts de empaquetado de artefactos y metadatos.
- Nuevas rutas centrales de sólo distribución bajo una versión explícita, autenticadas con la identidad del equipo y desplegadas en Dokploy.
- Bucket privado de iDrive e2, credenciales S3 restringidas almacenadas sólo como secretos de CI/Dokploy y enlaces prefirmados de corta duración.
- Flujo de GitHub Actions disparado por etiquetas de escritorio, con promoción separada de `pilot` a `stable`.
- Posibles campos aditivos de canal/estado de actualización en el registro central de dispositivos; no se modifican colecciones clínicas ni se migra contenido de pacientes, consultas o recetas.
- Migración idempotente de metadatos técnicos de equipos legacy (`device_key`, `nombre`, `modo`, `habilitado`) hacia sus equivalentes actuales, con escritura dual durante la transición.
