# Auditoría de cierre de actualizaciones automáticas de escritorio

Fecha: 2026-08-16

Cambio OpenSpec: `agregar-actualizaciones-automaticas-escritorio`

## Infraestructura confirmada

- Región iDrive e2: `us-east-1`.
- Endpoint: `s3.us-east-1.idrivee2.com`.
- Bucket privado y versionado: `consultorio-escritorio-releases`.
- Equipo piloto informado: `carlos`; la evidencia posterior identifica el dispositivo como `PC-E24D57F3`.
- Plataforma piloto: Microsoft Windows 11 Pro de 64 bits.
- Plataforma inicial soportada: Windows 11 x64.

Estos datos fueron suministrados por el responsable del despliegue durante la preparación del piloto. No se copiaron credenciales ni secretos a este documento.

## Publicación piloto verificada

La etiqueta `desktop-v0.1.7` ejecutó correctamente el workflow `desktop-release.yml`:

- Run: https://github.com/carlosacostap-unca/consultorio-oftalmologico/actions/runs/31878331630
- Commit de `main`: `3f91794c079ba424fd9c0f38febab101a1062031`.
- Job: `build-sign-publish-pilot`, concluido correctamente.
- Paso `Publicar objetos inmutables y mover el puntero pilot`, concluido correctamente.
- El workflow usa el entorno protegido `desktop-pilot` y credenciales separadas de publicación.
- El script de publicación crea objetos versionados con caché `immutable`, rechaza sobrescribirlos y actualiza el puntero del canal sólo después de publicar el release completo.
- El flujo no ejecuta operaciones de borrado; el manual operativo exige que la credencial del publicador no tenga `DeleteObject`.

La prueba manual documentada en `desktop-sync-pagination-pilot-2026-08-15.md` confirma que el equipo piloto recibió `0.1.7` mientras estaba asignado al canal `pilot`.

## Promoción estable observada

El workflow de promoción fue ejecutado correctamente:

- Run: https://github.com/carlosacostap-unca/consultorio-oftalmologico/actions/runs/31881058290
- Job: `verify-and-promote`, concluido correctamente.
- Paso `Verificar bytes firmados y promover el mismo release`, concluido correctamente.

Esto demuestra la promoción técnica del mismo artefacto sin recompilar. No completa por sí solo la tarea 7.5, porque todavía falta actualizar los demás equipos uno por uno y registrar el resultado y la conservación de datos de cada instalación.

## Evidencia parcial del ciclo piloto

La actualización `0.1.6` a `0.1.7` comprobó detección, descarga, disponibilidad de `Reiniciar y actualizar`, reinicio, instalación y conservación de sesión, identidad y sincronización. La instalación controlada sólo puede invocar NSIS después de crear y verificar el respaldo.

La tarea 7.3 continúa abierta porque aún falta evidencia de:

- usar efectivamente `Más tarde` y comprobar el recordatorio posterior;
- iniciar la actualización con operaciones locales pendientes;
- confirmar esas operaciones después del reinicio y la sincronización.

## Pruebas pendientes de fallo y despliegue

La tarea 7.4 continúa abierta hasta ejecutar y documentar en un entorno piloto aislado:

- falta de red;
- token central vencido;
- URL prefirmada expirada;
- manifiesto alterado;
- descarga corrupta;
- actualización obligatoria sin interrumpir trabajo local.

La tarea 7.5 continúa abierta hasta inventariar los demás equipos, actualizarlos individualmente y registrar por equipo:

- versión de origen y destino;
- resultado de instalación;
- identidad preservada;
- datos locales y operaciones pendientes preservados;
- estado final de sincronización y conflictos.
