## 1. Contratos y configuración

- [x] 1.1 Leer las guías locales de Next.js 16 para Route Handlers, runtime Node y variables de entorno antes de modificar la puerta central
- [ ] 1.2 Confirmar región, endpoint y bucket privado de iDrive e2, equipo piloto y sistema/arquitectura de las computadoras destino
- [x] 1.3 Definir y validar variables servidor para iDrive e2, URL del feed, habilitación de la puerta y clave pública de verificación sin exponerlas como `NEXT_PUBLIC_*`
- [x] 1.4 Incorporar `electron-updater` como dependencia del runtime y configurar electron-builder para generar metadatos NSIS compatibles con el proveedor genérico

## 2. Registro de equipos y autorización central

- [x] 2.1 Extender idempotentemente `sync_devices` con canal, habilitación, versión instalada y último resultado de actualización sin modificar datos clínicos
- [x] 2.2 Actualizar tipos y helpers de autenticación para resolver un equipo activo y su canal autoritativo mediante token central y cabecera de dispositivo
- [x] 2.3 Implementar la política de versión normal, obligatoria y mínima compatible con validación estricta de SemVer, plataforma y arquitectura
- [x] 2.4 Probar equipo estable/piloto, equipo revocado, token vencido, identidad inconsistente y versión incompatible
- [x] 2.5 Compatibilizar el esquema legacy de `sync_devices` mediante lectura/escritura dual, backfill técnico idempotente e índices posteriores, con pruebas y sin modificar registros clínicos

## 3. Puerta privada de actualizaciones

- [x] 3.1 Implementar un adaptador S3 servidor para leer metadatos y generar URLs GET prefirmadas de corta duración contra el endpoint de iDrive e2
- [x] 3.2 Implementar rutas Node versionadas para política, feed, artefactos y reporte de resultado bajo `/api/desktop-updates/v1`
- [x] 3.3 Restringir cada artefacto solicitado al manifiesto y canal asignados y evitar que nombres de objeto, rutas o redirecciones permitan acceso arbitrario al bucket
- [x] 3.4 Sanitizar logs y respuestas para excluir claves, tokens, URLs prefirmadas completas y contenido clínico
- [x] 3.5 Agregar pruebas de rutas para autorización, expiración, canal, redirección, objeto inexistente, traversal y fallas de iDrive e2

## 4. Construcción, firma y publicación

- [x] 4.1 Implementar generación canónica del manifiesto de release con versión, plataforma, arquitectura, tamaño y SHA-512 de cada artefacto
- [x] 4.2 Implementar firma Ed25519 en CI y verificación con clave pública, incluyendo pruebas de firma válida, manifiesto alterado, hash incorrecto y rotación controlada
- [x] 4.3 Crear el flujo GitHub Actions disparado sólo por `desktop-v<semver>` sobre un commit de `main`, con instalación limpia, auditoría, lint, tipos, pruebas, build y empaquetado
- [ ] 4.4 Subir objetos inmutables y actualizar atómicamente el canal `pilot` usando una credencial iDrive e2 restringida y sin permisos innecesarios de borrado
- [x] 4.5 Crear una promoción manual aprobada de `pilot` a `stable` que verifique y reutilice exactamente los mismos hashes sin recompilar
- [x] 4.6 Documentar secretos de GitHub/Dokploy, permisos mínimos, versionado del bucket, rotación de claves y recuperación del manifiesto anterior

## 5. Cliente de actualización y experiencia de usuario

- [x] 5.1 Integrar Electron Updater sólo en builds empaquetados, excluyendo desarrollo y smoke tests, con instalación automática al cerrar deshabilitada
- [x] 5.2 Autenticar el feed con el token central y la identidad del equipo, consultar al iniciar/reconectar/cada seis horas y reintentar sin bloquear el modo local
- [x] 5.3 Exponer por preload e IPC mínimo los estados disponible, descargando, lista, pospuesta, error y obligatoria, con versión y progreso
- [x] 5.4 Implementar la interfaz `Reiniciar y actualizar` / `Más tarde`, recordatorio normal cada 24 horas y una acción manual para buscar actualizaciones
- [x] 5.5 Implementar la política obligatoria sin cerrar una sesión activa, con barrera en el siguiente inicio limpio cuando el paquete ya está validado y continuidad offline cuando no pudo descargarse
- [x] 5.6 Verificar la firma del manifiesto y el SHA-512 del instalador descargado antes de habilitar cualquier ejecución y fallar de forma cerrada ante discrepancias

## 6. Respaldo, instalación y recuperación

- [x] 6.1 Implementar el bloqueo temporal de nuevas escrituras, la finalización/cancelación ordenada de sincronización y el cierre de Next.js/PocketBase previo al respaldo
- [x] 6.2 Crear respaldos en un directorio separado con base local, identidad, secretos cifrados, cola/cursores y manifiesto de hashes y versiones
- [x] 6.3 Verificar el respaldo antes de invocar NSIS y aplicar retención de al menos tres respaldos sin eliminar el único válido
- [x] 6.4 Ejecutar `quitAndInstall` únicamente después del respaldo válido y conservar la versión vigente si cualquier preparación falla
- [x] 6.5 Validar migraciones y salud de servicios en el primer inicio nuevo y mostrar recuperación segura sin interfaz clínica parcial si fallan
- [x] 6.6 Agregar pruebas para operaciones pendientes, respaldo corrupto, espacio insuficiente, servicio que no cierra, migración fallida y conservación de identidad/conflictos

## 7. Verificación y piloto

- [x] 7.1 Ejecutar auditorías, lint, TypeScript, pruebas unitarias/integración, build Next.js y validación OpenSpec desde una instalación limpia
- [x] 7.2 Generar el instalador bootstrap y probar manualmente la actualización desde 0.1.1 preservando base, identidad, activación y accesos directos
- [ ] 7.3 Publicar una versión posterior sólo en `pilot` y probar detección, descarga, posposición, respaldo, reinicio e instalación con datos de prueba y operaciones pendientes
- [ ] 7.4 Simular falta de red, token vencido, URL expirada, manifiesto alterado, descarga corrupta y actualización obligatoria sin interrumpir el trabajo local
- [ ] 7.5 Promover el artefacto probado a `stable`, actualizar los equipos restantes uno por uno y registrar versión, resultado y evidencia de conservación de datos
- [x] 7.6 Completar el manual operativo para publicar, promover, detener, diagnosticar y recuperar una actualización, incluyendo la advertencia de SmartScreen por ausencia de certificado comercial
