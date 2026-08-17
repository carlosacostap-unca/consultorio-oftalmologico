## Why

Los despliegues de producción en Dokploy quedaron bloqueados porque Nixpacks descarga `nixpkgs` desde GitHub y la IP del VPS recibió respuestas `429 Too Many Requests`. El release web necesita una construcción reproducible que no dependa de ese tarball externo ni seleccione automáticamente una versión de Node distinta de la validada.

## What Changes

- Incorporar un `Dockerfile` multi-etapa basado explícitamente en Node.js 22 para instalar, compilar y ejecutar la salida standalone de Next.js.
- Incorporar un `.dockerignore` que reduzca el contexto y excluya archivos locales, credenciales, artefactos y dependencias ya construidas.
- Ejecutar la aplicación desde `.next/standalone/server.js`, incluyendo `.next/static` y `public` en la imagen final.
- Mantener las credenciales y configuración sensible como variables de ejecución de Dokploy, sin declararlas como `ARG` ni persistirlas en capas de la imagen; sólo la URL pública `NEXT_PUBLIC_POCKETBASE_URL` se incorpora explícitamente durante el build.
- Documentar la configuración manual de Dokploy para usar el builder Dockerfile y verificar el SHA desplegado.
- Conservar el contrato actual: el build y el arranque no ejecutan migraciones, seeds ni importaciones de PocketBase.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `production-release-alignment`: el candidato web deberá construirse de forma reproducible con el Dockerfile versionado, Node.js 22 y la salida standalone, sin depender de Nixpacks ni incorporar secretos en la imagen.

## Impact

- Archivos de despliegue en la raíz del repositorio (`Dockerfile` y `.dockerignore`).
- Configuración manual del builder de las aplicaciones staging y producción en Dokploy.
- Proceso de build e inicio del servidor Next.js; no cambia ninguna API ni flujo clínico.
- Sin migraciones de datos, cambios de esquema PocketBase, seeds ni scripts de importación.
