# Despliegue web con Dockerfile en Dokploy

Esta aplicación se construye con el `Dockerfile` versionado del repositorio para evitar la dependencia de Nixpacks sobre descargas de `nixpkgs`. La imagen usa Node.js 22 y ejecuta la salida standalone de Next.js como usuario sin privilegios.

## Configuración común

En cada aplicación de Dokploy:

1. Seleccionar el builder **Dockerfile** en lugar de Nixpacks.
2. Configurar la ruta del archivo como `Dockerfile` y el contexto como la raíz del repositorio.
3. Configurar el puerto interno HTTP `3000`.
4. Mantener las credenciales existentes como variables de entorno de ejecución. No agregarlas como argumentos de build.
5. Agregar únicamente este argumento público de build con el mismo valor público ya usado por la aplicación:

   ```text
   NEXT_PUBLIC_POCKETBASE_URL=<URL publica de PocketBase>
   ```

El build se detiene con un mensaje explícito si `NEXT_PUBLIC_POCKETBASE_URL` no está definida. Next.js integra las variables `NEXT_PUBLIC_*` en el bundle cliente durante la construcción; por eso no alcanza con proporcionarla sólo al iniciar el contenedor.

## Staging

- Aplicación: `consultorio-oftalmologico-staging`.
- Rama: `develop`.
- Builder: Dockerfile.
- Ruta: `Dockerfile`.
- Puerto: `3000`.

Después del despliegue:

1. Comparar el SHA informado por Dokploy con el último SHA esperado de `develop`.
2. Abrir la pantalla de acceso de staging.
3. Comprobar mediante una solicitud de sólo lectura que `/api/desktop-sync/v1/conflicts?status=open&page=1` responde `401 invalid_session` sin credenciales.
4. No ejecutar migraciones, seeds, importaciones ni escrituras clínicas como parte del smoke test.

## Producción

- Aplicación: `consultorio-oftalmologico`.
- Rama: `main`.
- Builder: Dockerfile.
- Ruta: `Dockerfile`.
- Puerto: `3000`.

Repetir la configuración únicamente después de validar staging. Comparar el SHA desplegado con el merge aprobado en `main` y ejecutar el mismo smoke test no destructivo antes de continuar con una publicación de escritorio.

## Variables privadas

Las variables privadas continúan configuradas en Dokploy como variables de ejecución. Entre ellas pueden estar las credenciales administrativas de PocketBase, las credenciales de iDrive e2, el secreto de cifrado y secretos de tareas programadas. No deben copiarse al repositorio, declararse como `ARG` ni incluirse en archivos `.env` dentro de la imagen.

## Rollback

Si la imagen no construye o no inicia:

1. No eliminar el contenedor productivo anterior.
2. Restaurar el último despliegue exitoso desde Dokploy o volver temporalmente al builder anterior.
3. Confirmar que el dominio vuelve a responder antes de reintentar.
4. No ejecutar scripts de esquema o datos para resolver un fallo de infraestructura.

El comando de inicio de la imagen es `node server.js`; no debe reemplazarse por `npm run start`, porque el proyecto usa `output: "standalone"`.
