# Recuperación de sincronización de Windows sin pérdida de datos

El servidor puede rechazar conflictos cuando PocketBase conserva los campos heredados obligatorios `entidad`, `tipo` y `estado`. La corrección escribe ambos formatos, conserva los snapshots y reutiliza los conflictos por operación, equipo y actor. No requiere cambios de esquema ni eliminación de registros.

Windows 0.1.17 protege las ediciones locales sin confirmar frente a pull y confirmaciones históricas. Las escrituras clínicas y su cola comparten una transacción; el borrado físico está bloqueado. Si falla el almacenamiento de un conflicto, su operación sigue disponible para reintento. El servidor reconoce además una edición o baja ya aplicada cuando se interrumpe la confirmación durable.

## Actualización automática autorizada

El usuario confirmó que el doctor ya hizo un respaldo manual y usa 0.1.16. No se dispone de su ruta ni se verificó técnicamente esa copia. El actualizador existente crea y verifica un respaldo adicional, con los servicios detenidos, antes de instalar. Si falla, aborta la instalación y conserva los datos actuales. No hace falta exigir otra copia manual para preparar la distribución.

1. Renovar el respaldo central con un nombre exclusivo y verificar ZIP, SQLite y conteos en una copia separada. La verificación de archivo no equivale a una restauración funcional. Conservar las copias anteriores.
2. Aprobar las pruebas sintéticas y la compilación del servidor. El push a main activa el despliegue automático confirmado por el responsable. Comprobar el servicio y su cabecera X-Consultorio-Sync-Minimum-Version: 0.1.17. No ejecutar migraciones ni scripts de esquema.
3. El servidor rechaza con 426 los intentos de sincronización de versiones anteriores, antes de modificar datos clínicos. Mantiene disponibles la política, el feed y los reportes del actualizador para 0.1.16.
4. Publicar el release firmado en pilot. Verificar sus metadatos y archivos, y promover los mismos bytes a stable mediante el workflow protegido. No recompilar entre canales ni distribuir los instaladores locales anteriores a la guarda.
5. El doctor abre la aplicación, busca la actualización y acepta Reiniciar y actualizar cuando termine de guardar su trabajo. El actualizador verifica el respaldo antes de ejecutar el instalador.
6. Confirmar 0.1.17, abrir Sincronización y pulsar Sincronizar ahora. Conservar identificadores y payloads originales: no vaciar la cola ni marcar confirmaciones manualmente.
7. Conciliar las operaciones contra sus confirmaciones y registros centrales o conflictos con ambas versiones. Comparar contenido y relaciones, además de cantidades. Resolver diferencias clínicas sólo mediante revisión explícita; no omitir la protección si una vinculación de pacientes se detiene.

## Comprobación asistida del respaldo, si se investiga una anomalía

Con la aplicación completamente cerrada, conservar la carpeta completa (device.json, secure, pocketbase/pb_data y demás archivos). El verificador de solo lectura se ejecuta con node scripts/verify_desktop_sync_backup.mjs --source ORIGINAL --backup COPIA --device-code CODIGO. Para inspeccionar SQLite o restaurar, usar una tercera copia aislada sin acceso central; nunca el original ni la única copia. Exportar diagnóstico no respalda la base.

Ante anomalías detener reintentos y conservar bases, logs, snapshots y cola. No restaurar sobre datos nuevos ni deduplicar destructivamente. La reversión de código conserva el esquema mixto y toda evidencia.

## Evidencia automatizada

`npm run test:sync-core`: 201 pruebas aprobadas. `npm run test:sync-preservation`: 14 aprobadas. `npm run test:sync-roundtrip`: 9 aprobadas. Las suites comparten casos. Los ensayos crean únicamente bases ficticias en loopback, no cargan archivos de entorno y bloquean solicitudes externas. Se conservan sus resultados en `.tmp`.

El recorrido completo verifica altas y ediciones offline con relaciones, respuestas perdidas, confirmaciones interrumpidas, ediciones durante la confirmación, conflictos explícitos y bajas lógicas sin borrar físicamente. Con `SYNC_PILOT_PACKAGED_SERVER=<ruta-absoluta-a-resources/app>` repite las pruebas por HTTP contra el servidor compilado del instalador.

El arranque del ejecutable empaquetado exige `--smoke-test --smoke-test-profile=<ruta-absoluta-nueva>`. Rechaza perfiles existentes o relacionados con el habitual antes de iniciar servicios. No constituye un modo interactivo para atender pacientes. El verificador `scripts/verify_desktop_sync_pilot.mjs` usa una base vacía y controles SQLite de solo lectura.

El piloto 0.1.17-pilot.1 se conserva inmutable; el release automático 0.1.17 incorpora además la cabecera de compatibilidad probada. Next/eslint-config-next se actualizaron a 16.3.8 y se aplicaron parches compatibles de sharp/source-map-js; la auditoría de producción quedó sin vulnerabilidades. Las pruebas aisladas no acreditan la recuperación del incidente real. El ensayo incluye bloqueo del cliente antiguo sin escrituras y acceso autenticado de 0.1.16 al actualizador.

La publicación del instalador y el despliegue del backend son pasos distintos. El instalador local carece de Authenticode y no se publicó en canales automáticos. La firma Ed25519 y las barreras de publicación existentes siguen siendo obligatorias para distribuir mediante el actualizador.

## Separación de respaldos por entorno

Antes de confiar en respaldos automáticos, comprobar que producción y pruebas usan almacenes y retención separados. Un nombre automático y un horario compartidos pueden dejar una copia íntegra correspondiente al entorno equivocado. La intervención utiliza un respaldo manual de producción con nombre exclusivo y verifica su contenido técnico; conservar los respaldos existentes. Separar la configuración requiere verificar el destino y la retención, sin borrar ni mover las copias previas. Cambiar solamente la hora no separa la retención.
