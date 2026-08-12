## Context

La versión 0.1.1 se distribuye como instalador NSIS por usuario para Windows x64. Una instalación posterior reemplaza los binarios sin borrar `app.getPath("userData")`, pero el usuario todavía debe recibir y ejecutar manualmente cada instalador. El proceso principal ejecuta Next.js standalone y PocketBase local, conserva la identidad del equipo y un token central cifrado, y ya autentica solicitudes centrales mediante el usuario y `x-consultorio-device-id`.

Las versiones se almacenarán en un bucket privado de iDrive e2. La aplicación web central corre en Dokploy y puede conservar credenciales S3 sólo del lado servidor. No habrá certificado comercial de firma de código, habrá inicialmente entre cuatro y seis equipos, y Windows 11 x64 será la plataforma soportada.

## Goals / Non-Goals

**Goals:**

- Instalar una vez y aplicar versiones posteriores desde la propia aplicación.
- Descargar sin interrumpir el trabajo y pedir confirmación antes de cerrar/reiniciar.
- Preservar y respaldar datos clínicos locales, identidad, secretos y operaciones pendientes.
- Mantener iDrive e2 privado y autorizar cada descarga a través del backend central.
- Separar releases web de releases de escritorio y promover el mismo artefacto de `pilot` a `stable`.
- Rechazar manifiestos o instaladores alterados aun sin certificado comercial de Windows.
- Permitir actualizaciones obligatorias sin cerrar una consulta ni inutilizar el modo offline por una falla de red.

**Non-Goals:**

- Eliminar las advertencias SmartScreen o mostrar un editor verificado sin adquirir un certificado reconocido por Windows.
- Soportar Windows de 32 bits, ARM64, Windows 10, macOS o Linux en esta etapa.
- Actualizar PocketBase central, ejecutar migraciones clínicas o publicar automáticamente el escritorio con cada despliegue web.
- Implementar actualización peer-to-peer, por red local o desde medios extraíbles.
- Construir una consola completa de administración de releases; la promoción inicial será una acción deliberada del flujo de CI.

## Decisions

### 1. Versiones de escritorio explícitas e independientes del despliegue web

Una versión se construirá sólo desde una etiqueta `desktop-v<semver>` que apunte a un commit integrado en `main`. El flujo ejecutará una instalación limpia, controles de seguridad, lint, tipos, pruebas, build Next.js y empaquetado NSIS. Generará el instalador, metadatos estándar de Electron Updater, un manifiesto firmado y sus hashes.

La etiqueta publicará primero en `pilot`. La promoción a `stable` será manual y reutilizará exactamente los mismos bytes; no reconstruirá el instalador. Se descarta publicar con cada push a `main` porque cambios exclusivamente centrales no requieren reemplazar el runtime local y una publicación implícita reduce la trazabilidad.

### 2. Bucket privado y puerta de descarga en Dokploy

iDrive e2 conservará objetos inmutables por versión y punteros por canal, por ejemplo `releases/<version>/...`, `channels/pilot/...` y `channels/stable/...`. El bucket tendrá versionado, una credencial de escritura restringida para CI y otra de lectura para Dokploy. Ninguna credencial S3 se incluirá en el repositorio, el navegador o el instalador.

Rutas Node de la aplicación central bajo `/api/desktop-updates/v1` validarán el token central, la identidad del equipo, su estado activo y el canal asignado. Servirán los metadatos pequeños y responderán las solicitudes de artefactos con una redirección a un enlace prefirmado de vida corta. El canal enviado por el cliente no será autoritativo.

`sync_devices` recibirá de forma aditiva los datos mínimos para `update_channel`, habilitación, versión instalada y último resultado informado. No se modifican colecciones clínicas. Se descarta colocar una clave de sólo lectura dentro del cliente porque cualquier secreto distribuido puede extraerse y no permite revocar un equipo de forma individual.

### 3. Electron Updater con instalación exclusivamente controlada

Se utilizará `electron-updater` con el destino NSIS actual y un proveedor genérico apuntando a la puerta central. El proceso principal consultará después de iniciar correctamente, cuando exista sesión central válida, al reconectar, cada seis horas y mediante una acción manual. Una falla de consulta nunca impedirá abrir la copia local.

La descarga será automática y expondrá estado/progreso al renderer mediante IPC limitado. `autoInstallOnAppQuit` quedará deshabilitado: cerrar la aplicación normalmente no podrá instalar una descarga sin ejecutar antes el respaldo. Sólo el flujo controlado de `Reiniciar y actualizar` invocará la instalación.

El runtime de desarrollo, las pruebas smoke y una aplicación no empaquetada no consultarán producción. Se descarta implementar un descargador/instalador propio porque NSIS y Electron Updater ya resuelven reemplazo por usuario, metadatos, progreso y reinicio.

### 4. Integridad propia sin confundirla con firma comercial

CI generará un manifiesto canónico que incluya versión, plataforma, arquitectura, tamaño y SHA-512 de cada artefacto, y lo firmará con Ed25519. La clave privada estará sólo en secretos del entorno de publicación; la clave pública se incorporará a la aplicación. Antes de instalar, el proceso principal verificará la firma del manifiesto y el hash del instalador descargado, además del checksum estándar de `latest.yml`.

La verificación fallará de forma cerrada y registrará únicamente datos técnicos. Esta firma propia protege el canal ante reemplazos accidentales o una escritura no autorizada en el bucket, pero no produce reputación SmartScreen ni un editor reconocido por Windows. Se acepta expresamente esa limitación y se mantiene visible en la documentación de instalación.

### 5. Canales deterministas y política de obligatoriedad

Cada equipo activo pertenecerá a `pilot` o `stable`; no se usará un porcentaje aleatorio para una flota tan pequeña. Un único equipo será piloto. La política central distinguirá:

- `normal`: descarga y recuerda cada 24 horas; el usuario puede elegir `Más tarde`.
- `mandatory`: informa el motivo y la fecha efectiva, nunca cierra la aplicación por sí sola y exige aplicar una descarga ya validada en el siguiente inicio limpio antes de habilitar el trabajo normal.

Si una versión obligatoria todavía no pudo descargarse por falta de red, la copia local seguirá disponible con una advertencia persistente para no bloquear atención clínica offline. El backend podrá bloquear sincronización incompatible por versión mínima, pero no borrará ni ocultará operaciones locales pendientes.

### 6. Respaldo consistente antes de reemplazar binarios

Al elegir `Reiniciar y actualizar`, la aplicación impedirá nuevas escrituras, esperará o cancelará ordenadamente una sincronización en curso, detendrá Next.js y PocketBase local y copiará los datos durables a un directorio de respaldos separado. El respaldo incluirá la base PocketBase, identidad del equipo, secretos cifrados y estado de sincronización, junto con un manifiesto de archivos, hashes y versiones origen/destino.

La instalación se abortará si el respaldo o su verificación falla. Se conservarán al menos los tres últimos respaldos válidos y nunca se eliminará el único respaldo disponible. Las migraciones locales se ejecutarán al iniciar la versión nueva; si fallan, la aplicación no abrirá una interfaz clínica parcial y mostrará diagnóstico y ruta de recuperación.

### 7. Compatibilidad y reversión

El feed ofrecerá sólo artefactos `win32-x64` a instalaciones compatibles. Arquitecturas o sistemas no admitidos recibirán una explicación y no descargarán el instalador.

Una versión ya instalada no se revertirá automáticamente a un número inferior. Ante una regresión se detendrá la promoción, se conservará `stable` en la versión anterior para equipos no actualizados y se publicará un hotfix con un número superior para los equipos afectados. El respaldo previo permitirá recuperación asistida de datos; el instalador anterior se conservará en el almacenamiento versionado.

## Risks / Trade-offs

- [El instalador no está firmado con un certificado reconocido] → Documentar SmartScreen, verificar una firma Ed25519 propia y limitar estrictamente las credenciales de publicación.
- [Compromiso simultáneo de CI y de la clave privada propia] → Proteger secretos con entornos aprobados, rotación, permisos mínimos y promoción manual; una firma propia no equivale a una raíz de confianza externa.
- [El token central expiró al buscar una actualización] → Mantener el trabajo local, volver a consultar después de reautenticar y no exponer credenciales S3 al cliente.
- [Una descarga grande atraviesa el VPS] → Redirigir a un enlace prefirmado de iDrive e2 para que Dokploy autorice pero no transporte el cuerpo completo.
- [Se actualiza mientras existen cambios pendientes] → Respaldar también la cola y los cursores; la actualización no exige que los datos clínicos estén sincronizados.
- [Una migración local es incompatible] → Probar actualización desde la última versión estable, hacer respaldo verificable y fallar antes de exponer una base parcialmente migrada.
- [Una versión obligatoria coincide con un corte de Internet] → Permitir continuidad offline con advertencia y aplicar la barrera sólo cuando el paquete validado esté disponible o al sincronizar con un protocolo incompatible.
- [Algún equipo no es Windows 11 x64] → Ejecutar inventario previo al piloto y rechazar el artefacto incompatible sin modificar la instalación existente.

## Migration Plan

1. Confirmar región/endpoint, bucket privado y claves separadas de iDrive e2; habilitar versionado y auditoría.
2. Agregar de forma aditiva la política de actualización a `sync_devices` y desplegar la puerta central deshabilitada por configuración.
3. Implementar publicación reproducible, manifiesto firmado y carga a `pilot` sin afectar clientes existentes.
4. Integrar el updater, estado visual, respaldo y recuperación en una versión bootstrap que todavía se instalará manualmente sobre 0.1.1.
5. Probar 0.1.1 → bootstrap → versión piloto, incluyendo red cortada, firma inválida, descarga corrupta, respaldo fallido y operaciones pendientes.
6. Instalar la versión bootstrap en un equipo piloto, promover una actualización de prueba y verificar datos, identidad y sincronización.
7. Habilitar `stable` y actualizar los demás equipos uno por uno; conservar los instaladores y respaldos anteriores.

Rollback: antes de la promoción se deshabilita `pilot` o se restaura su puntero. Después de una instalación se publica un hotfix de versión superior; si la aplicación no inicia, soporte reinstala el último instalador conocido y restaura el respaldo verificado. Deshabilitar la puerta de actualización no afecta el funcionamiento offline ni el despliegue web ordinario.

## Open Questions

- Endpoint y región exactos de la cuenta iDrive e2, nombre definitivo del bucket y límites de enlaces prefirmados.
- Equipo que se asignará al canal `pilot`.
- Confirmación del sistema operativo y arquitectura de las cuatro a seis computadoras.
- Política final de retención de respaldos por espacio disponible, manteniendo tres como mínimo.
