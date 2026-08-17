## Context

Dokploy construye actualmente la aplicación con Nixpacks. Ese builder genera un Dockerfile efímero que selecciona Node.js 24 y descarga `nixpkgs` desde GitHub durante cada construcción. Dos intentos consecutivos de producción fallaron antes de ejecutar `npm ci` con `429 Too Many Requests`, por lo que el resultado depende de un recurso externo ajeno al lockfile y al repositorio.

La aplicación ya usa `output: "standalone"` de Next.js 16.3.0. La guía local de Next.js confirma que esa salida es apta para una imagen Docker mínima, pero requiere copiar explícitamente `.next/static` y `public`. Dokploy mantiene el proxy inverso y las variables de entorno de cada aplicación.

## Goals / Non-Goals

**Goals:**

- Construir staging y producción mediante un Dockerfile versionado y reproducible con Node.js 22.
- Ejecutar el servidor standalone de Next.js como usuario sin privilegios.
- Excluir del contexto de build credenciales, archivos locales, dependencias y artefactos generados.
- Mantener la configuración sensible como variables de ejecución administradas por Dokploy.
- Conservar el proceso actual sin migraciones, seeds ni importaciones automáticas.

**Non-Goals:**

- Cambiar APIs, pantallas, datos clínicos o el esquema de PocketBase.
- Publicar o promover una versión de escritorio como efecto de este cambio.
- Introducir un registro privado de imágenes, despliegues multi-instancia o caché distribuida.
- Automatizar operaciones administrativas en Dokploy.

## Decisions

### Dockerfile multi-etapa con Node.js 22

Se usarán etapas separadas para dependencias, build y runtime basadas en `node:22-bookworm-slim`. La versión mayor queda fijada y coincide con la versión adoptada por los workflows del repositorio. Se prefiere Debian slim sobre Alpine para reducir diferencias de `glibc` y compatibilidad con dependencias nativas de Next.js.

Alternativa descartada: mantener Nixpacks y fijar `NIXPACKS_NODE_VERSION=22`. Esa opción no elimina la descarga de `nixpkgs` que produjo el bloqueo ni versiona completamente el proceso de construcción.

### Runtime standalone mínimo

La etapa final copiará `.next/standalone`, `.next/static` y `public`, expondrá el puerto 3000 y ejecutará `node server.js` con `HOSTNAME=0.0.0.0`. No ejecutará `next start`, porque Next.js advierte que ese comando no corresponde cuando `output: "standalone"` está habilitado.

Alternativa descartada: copiar el repositorio completo y ejecutar `npm run start`. Aumenta el tamaño, conserva dependencias de desarrollo y contradice el modo standalone ya configurado.

### Separación de secretos y build

El Dockerfile no declarará `ARG` para credenciales ni copiará archivos `.env*`. Las variables privadas se resolverán al iniciar el contenedor desde Dokploy. La aplicación ya consume `NEXT_PUBLIC_POCKETBASE_URL` desde código cliente, por lo que el Dockerfile aceptará exclusivamente esa URL pública como argumento de build y fallará de forma explícita cuando falte; Next.js la integra en el bundle durante `next build`.

Alternativa descartada: reenviar todas las variables de Dokploy como argumentos de build. Docker puede persistirlas en metadatos o capas y ya advierte sobre esa exposición.

### Configuración manual y verificable en Dokploy

Se documentará seleccionar el builder Dockerfile, la ruta `Dockerfile`, el puerto 3000, el argumento público `NEXT_PUBLIC_POCKETBASE_URL` y la rama correspondiente (`develop` para staging, `main` para producción). La publicación seguirá requiriendo comparar el SHA desplegado y realizar un smoke test no destructivo.

## Risks / Trade-offs

- [La etiqueta `node:22-bookworm-slim` puede recibir actualizaciones de parches] → conservar Node 22 como contrato mayor, validar cada build y permitir fijar un digest en un cambio futuro si se necesita reproducibilidad binaria.
- [Una variable necesaria durante `next build` podría no estar disponible] → validar el build dentro de Docker sin archivos `.env`; documentar por separado cualquier futura variable pública de build.
- [El cambio de builder en Dokploy es manual] → aplicar primero en staging, comprobar logs y SHA, y recién después repetir la misma configuración en producción.
- [La imagen final no incluye herramientas de diagnóstico generales] → priorizar una superficie mínima; los logs de aplicación y las herramientas de Dokploy permanecen disponibles.

## Migration Plan

1. Incorporar y validar el Dockerfile y `.dockerignore` en una rama aislada.
2. Integrar en `develop` y cambiar únicamente staging a builder Dockerfile.
3. Desplegar staging, comprobar arranque, login y endpoint de sincronización sin escribir datos.
4. Integrar el cambio aprobado en `main`.
5. Cambiar producción a builder Dockerfile y desplegar el SHA esperado.
6. Si falla, restaurar temporalmente el builder anterior o mantener el contenedor productivo previo; no ejecutar migraciones ni modificar datos.

## Open Questions

Ninguna para esta implementación de una sola instancia. La fijación por digest y una política de renovación de imágenes base pueden abordarse como endurecimiento posterior.
