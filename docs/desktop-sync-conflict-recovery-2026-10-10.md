# Recuperación de sincronización de Windows sin pérdida de datos

El servidor puede rechazar conflictos cuando PocketBase conserva los campos heredados obligatorios `entidad`, `tipo` y `estado`. La corrección escribe ambos formatos, conserva los snapshots y reutiliza los conflictos por operación, equipo y actor. No requiere cambios de esquema ni eliminación de registros.

Windows 0.1.17 protege las ediciones locales sin confirmar frente a pull y confirmaciones históricas. Las escrituras clínicas y su cola comparten una transacción; el borrado físico está bloqueado. Si falla el almacenamiento de un conflicto, su operación sigue disponible para reintento. El servidor reconoce además una edición o baja ya aplicada cuando se interrumpe la confirmación durable.

## Antes de activar la recuperación

1. Coordinar una ventana sin trabajo clínico. Cerrar completamente la aplicación.
2. Copiar la carpeta de datos completa, incluyendo `device.json`, `secure`, `pocketbase/pb_data`, logs y demás archivos. Conservar original y copia sin cambios. Exportar diagnóstico no respalda la base.
3. Verificar bytes con `node scripts/verify_desktop_sync_backup.mjs --source "ORIGINAL" --backup "COPIA" --device-code "CODIGO"`. El verificador es de solo lectura; igualdad de bytes no acredita por sí sola restaurabilidad.
4. Crear una tercera copia aislada y comprobar SQLite, archivos WAL/SHM, conteos, relaciones, cola, snapshots y cursores. Abrirla únicamente con acceso central bloqueado. No reparar ni restaurar encima del original o del respaldo.
5. Crear un respaldo central adicional y comprobar su archivo y base sobre otra copia. Comparar con el servidor: una fecha reciente y un ZIP íntegro no demuestran que el respaldo incluya los registros actuales. Conservar todos los respaldos previos. Para restauración completa usar otra instancia con tareas, correos y conexiones salientes bloqueados.

## Orden de instalación y despliegue

1. Mantener el cliente sin acceso central e instalar primero Windows 0.1.17, conservando identidad y rutas. Verificar arranque y disponibilidad local.
2. Desplegar el backend compatible después de validar staging y comprobar el SHA desplegado. No ejecutar `schema:desktop-sync` como atajo. No liberar reintentos automáticos de versiones antiguas antes de instalar la protección local.
3. Habilitar conexión y ejecutar un primer reintento controlado. Conservar los identificadores originales y todos los payloads; nunca vaciar la cola ni marcar confirmaciones manualmente.
4. Conciliar cada operación contra su confirmación durable y registro central o conflicto con ambas versiones. Comparar contenido y relaciones, además de cantidades.
5. Resolver diferencias clínicas sólo con revisión explícita. La vinculación de pacientes con consultas pendientes puede detenerse por protección; revisar el mapeo sin omitir la guarda.

Ante anomalías detener reintentos y conservar bases, logs, snapshots y cola. No restaurar sobre datos nuevos ni deduplicar destructivamente. La reversión de código conserva el esquema mixto y toda evidencia.

## Evidencia automatizada

`npm run test:sync-core`: 200 pruebas aprobadas. `npm run test:sync-preservation`: 14 aprobadas. `npm run test:sync-roundtrip`: 8 aprobadas. Las suites comparten casos. Los ensayos crean únicamente bases ficticias en loopback, no cargan archivos de entorno y bloquean solicitudes externas. Se conservan sus resultados en `.tmp`.

El recorrido completo verifica altas y ediciones offline con relaciones, respuestas perdidas, confirmaciones interrumpidas, ediciones durante la confirmación, conflictos explícitos y bajas lógicas sin borrar físicamente. Con `SYNC_PILOT_PACKAGED_SERVER=<ruta-absoluta-a-resources/app>` repite las pruebas por HTTP contra el servidor compilado del instalador.

El arranque del ejecutable empaquetado exige `--smoke-test --smoke-test-profile=<ruta-absoluta-nueva>`. Rechaza perfiles existentes o relacionados con el habitual antes de iniciar servicios. No constituye un modo interactivo para atender pacientes. El verificador `scripts/verify_desktop_sync_pilot.mjs` usa una base vacía y controles SQLite de solo lectura.

El piloto 0.1.17-pilot.1 se conserva inmutable; 0.1.17 mantiene su código probado, con metadatos de versión finales. Next/eslint-config-next se actualizaron a 16.3.8 y se aplicaron parches compatibles de sharp/source-map-js; la auditoría de producción quedó sin vulnerabilidades. Las pruebas locales no acreditan todavía la recuperación del incidente real ni reemplazan la comprobación del respaldo del equipo afectado.

La publicación del instalador y el despliegue del backend son pasos distintos. El instalador local carece de Authenticode y no se publicó en canales automáticos. La firma Ed25519 y las barreras de publicación existentes siguen siendo obligatorias para distribuir mediante el actualizador.

## Separación de respaldos por entorno

Antes de confiar en respaldos automáticos, comprobar que producción y pruebas usan almacenes y retención separados. Un nombre automático y un horario compartidos pueden dejar una copia íntegra correspondiente al entorno equivocado. La intervención utiliza un respaldo manual de producción con nombre exclusivo y verifica su contenido técnico; conservar los respaldos existentes. Separar la configuración requiere verificar el destino y la retención, sin borrar ni mover las copias previas. Cambiar solamente la hora no separa la retención.

