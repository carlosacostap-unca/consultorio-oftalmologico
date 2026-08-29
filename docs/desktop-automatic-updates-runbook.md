# Manual operativo de actualizaciones de escritorio

Este procedimiento publica instaladores Windows 11 x64 en un bucket privado de iDrive e2. La aplicación central autoriza cada equipo y entrega enlaces prefirmados; ningún instalador contiene credenciales S3 ni la clave privada Ed25519.

## Separación de credenciales

Configurar tres identidades diferentes en iDrive e2:

1. **Publicador `pilot` (GitHub, entorno `desktop-pilot`)**: puede crear objetos bajo `releases/*` y escribir únicamente `channels/pilot/current.json`. No necesita `DeleteObject`.
2. **Promotor `stable` (GitHub, entorno `desktop-stable`)**: puede leer `releases/*` y escribir únicamente `channels/stable/current.json`. No recompila ni modifica releases.
3. **Lector Dokploy**: puede leer `releases/*` y `channels/*/current.json`. No puede escribir ni eliminar objetos.

Habilitar versionado del bucket antes del primer release. Mantenerlo privado y sin políticas de acceso público. Si iDrive exige `ListBucket`, limitarlo a esos prefijos; no conceder administración del bucket ni eliminación de versiones.

## Variables y secretos

### GitHub: entorno protegido `desktop-pilot`

Secretos:

- `DESKTOP_UPDATE_PRIVATE_KEY`: clave privada Ed25519 PKCS#8 DER codificada en Base64.
- `IDRIVE_E2_ACCESS_KEY_ID` y `IDRIVE_E2_SECRET_ACCESS_KEY`: credencial del publicador piloto.

Variables:

- `DESKTOP_UPDATE_KEY_ID`: identificador `ed25519-<huella>` de la clave activa.
- `DESKTOP_UPDATE_PUBLIC_KEYS`: objeto JSON `{"ed25519-<huella>":"<SPKI DER Base64>"}`. Puede contener dos claves durante una rotación.
- `DESKTOP_UPDATE_MINIMUM_VERSION`: versión mínima compatible.
- `DESKTOP_UPDATE_FEED_URL`: `https://<dominio>/api/desktop-updates/v1/feed`.
- `IDRIVE_E2_ENDPOINT`, `IDRIVE_E2_REGION` e `IDRIVE_E2_BUCKET`.

El entorno debe exigir aprobación y restringirse a la rama `main` y etiquetas protegidas `desktop-v*`.

### GitHub: entorno protegido `desktop-stable`

Configurar `DESKTOP_UPDATE_PUBLIC_KEYS`, las tres variables de iDrive y una credencial exclusiva de promoción en los dos secretos `IDRIVE_E2_*`. Exigir aprobación manual.

### Dokploy

Configurar únicamente en el servidor:

- `DESKTOP_UPDATES_ENABLED=true`
- `DESKTOP_UPDATE_FEED_URL`
- `DESKTOP_UPDATE_PUBLIC_KEY` con la clave pública activa en SPKI DER Base64
- `DESKTOP_UPDATE_PRESIGNED_TTL_SECONDS=900`
- `IDRIVE_E2_ENDPOINT`, `IDRIVE_E2_REGION`, `IDRIVE_E2_BUCKET`
- `IDRIVE_E2_ACCESS_KEY_ID`, `IDRIVE_E2_SECRET_ACCESS_KEY` del lector

No usar nombres `NEXT_PUBLIC_*`. Deshabilitar la puerta con `DESKTOP_UPDATES_ENABLED=false` no afecta la aplicación web ni el modo offline.

## Publicar primero en piloto

1. Integrar el cambio en `main` y actualizar la versión de `package.json`.
2. Crear una etiqueta exacta `desktop-v<semver>` sobre ese commit.
3. El workflow `desktop-release.yml` valida que el commit pertenezca a `main`, ejecuta instalación limpia, auditoría, lint, TypeScript, pruebas, build y NSIS.
4. CI incorpora el llavero público, genera el manifiesto canónico, firma con Ed25519 y conserva evidencia en GitHub.
5. CI crea objetos inmutables `releases/<version>/*` y sólo después reemplaza `channels/pilot/current.json` mediante una escritura única.
6. Verificar el equipo piloto antes de promover.

Un objeto de release existente provoca un fallo; nunca se sobrescribe silenciosamente. Para corregir un release se debe publicar un SemVer superior.

## Promover a estable

Antes de solicitar la aprobación del entorno protegido, ejecutar en el contenedor de staging:

```sh
cd /app && node scripts/verify_desktop_stable_preflight.mjs
```

La prevalidación usa exclusivamente lecturas S3. Comprueba los punteros `pilot` y `stable`, la firma Ed25519 de ambos manifiestos, sus políticas `win32-x64`, la presencia de un único instalador y que la versión piloto sea estrictamente posterior. No descarga instaladores, no escribe objetos y no reemplaza punteros. Conservar su salida sanitizada como evidencia y solicitar una autorización separada antes de promover.

Ejecutar manualmente `desktop-promote-stable.yml`, indicar la versión probada y aprobar el entorno `desktop-stable`. El flujo descarga y verifica manifiesto, firma y SHA-512 de cada objeto y actualiza únicamente el puntero estable. No recompila.

## Detener o revertir una distribución

- Antes de promover: no ejecutar la promoción; `stable` conserva la versión anterior.
- Para detener nuevas descargas: asignar temporalmente `DESKTOP_UPDATES_ENABLED=false` en Dokploy.
- Para recuperar un puntero: restaurar desde el versionado del bucket la versión anterior de `channels/<canal>/current.json` después de verificar su contenido.
- Para equipos que ya instalaron una versión defectuosa: publicar un hotfix con número superior. No forzar un downgrade.

Nunca borrar el instalador o manifiesto al que todavía apunta un canal.

## Rotar la clave Ed25519

1. Generar un nuevo par fuera del repositorio y conservar la privada sólo en el entorno de publicación.
2. Agregar la clave pública nueva al JSON `DESKTOP_UPDATE_PUBLIC_KEYS`, manteniendo la anterior.
3. Publicar una versión firmada con la clave anterior que incorpore ambas claves públicas.
4. Confirmar que todos los equipos instalaron esa versión puente.
5. Cambiar `DESKTOP_UPDATE_PRIVATE_KEY` y `DESKTOP_UPDATE_KEY_ID` a la clave nueva.
6. Publicar y probar un release nuevo; retirar la clave anterior sólo después de actualizar toda la flota.

La aplicación falla de forma cerrada si la huella, firma o SHA-512 no coinciden.

## Diagnóstico y recuperación

- Revisar el estado técnico por equipo en `sync_devices`: versión instalada, canal, fecha, etapa y código.
- Exportar el diagnóstico desde la aplicación. Los logs eliminan tokens y consultas de URLs prefirmadas.
- Los respaldos previos están bajo el directorio `backups` del perfil de la aplicación; cada uno contiene `backup-manifest.json` con hashes.
- Si falla una migración o un servicio después de actualizar, la aplicación no abre la interfaz clínica y muestra la ruta del respaldo verificado.
- Conservar el respaldo y el instalador anterior. La restauración debe ser asistida: cerrar la aplicación, verificar el manifiesto, reinstalar la versión conocida y restaurar sólo desde un respaldo válido.

## SmartScreen

El instalador no tiene certificado comercial de firma de código. Windows puede mostrar una advertencia SmartScreen, especialmente en la primera instalación o cuando cambia el instalador. La firma Ed25519 propia protege la distribución dentro de la aplicación, pero no crea reputación SmartScreen ni muestra un editor verificado por Windows.
