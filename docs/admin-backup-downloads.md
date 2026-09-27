# Descarga de backups para administradores

La opción **Backups** aparece en el menú al usar el rol **Admin**, tanto en web como en Windows. Lista todos los respaldos centrales disponibles, incluidos manuales, desde el más reciente. Cada fila muestra fecha, nombre, tipo, tamaño y **Descargar**.

El listado proviene de la API de backups de PocketBase, que consulta su almacenamiento configurado. La configuración comprobada el 20/09/2026 guarda copias automáticas diarias y conserva 30 automáticos. Este límite no elimina ni oculta copias manuales.

## Configuración del servidor web en Dokploy

Agregar en Environment de la aplicación web (Next.js):

```dotenv
BACKUP_S3_ACCESS_KEY_ID=<clave-de-acceso-de-lectura>
BACKUP_S3_SECRET_ACCESS_KEY=<clave-secreta-de-lectura>
```

Usar credenciales de IDrive e2 que puedan leer los objetos del bucket de backups `consultorio-oftalmologico-backup`. Mantener los valores exclusivamente en el servidor; no enviarlos por chat ni usar prefijo `NEXT_PUBLIC_`. No utilizar el bucket ni las credenciales de publicación de instaladores.

El endpoint, región, bucket y estilo de dirección se obtienen de **Settings → Backups → S3** de PocketBase mediante las credenciales administrativas del servidor ya existentes. No hace falta volver a copiarlos en otras variables. PocketBase oculta la clave secreta al consultar su API, por eso se necesitan las dos variables anteriores para firmar descargas directas.

Permiso mínimo para la clave de lectura, según el sistema de políticas disponible en el proveedor:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::consultorio-oftalmologico-backup/*.zip"]
  }]
}
```

La cuenta que ejecuta los backups automáticos conserva sus permisos actuales. Las nuevas credenciales de descarga no necesitan escribir ni borrar objetos. No se cambia la retención.

Guardar y volver a desplegar la aplicación web. Sin estas variables, el listado continúa disponible y se indica que la descarga aún no está habilitada.

## Publicación y comprobación

1. Publicar primero el backend web con `/api/backups` y `/api/backups/download`, y configurar las dos variables en Dokploy.
2. Con un usuario de aplicación que tenga Admin activo, comprobar el listado y descargar una copia elegida por el administrador. La respuesta debe provenir directamente del host S3, sin pasar los bytes por Next.js.
3. Publicar una nueva versión de Windows que incluya `desktop/backup-client.mjs` y el bridge `backups`. La 0.1.14 publicada antes de este cambio todavía no contiene esta función.
4. En Windows, iniciar sesión con conexión y seleccionar Admin. Comprobar que Backups abre la misma lista y permite guardar el archivo con el gestor nativo.
5. Con Médico o Secretaria, la opción no aparece y las solicitudes a las APIs responden 403.

Windows necesita conexión; no lista los respaldos locales previos a actualizaciones. La sesión central debe corresponder al mismo usuario autenticado localmente. Si no coincide o está vencida, volver a iniciar sesión con Internet.

## Protección y alcance

- Autorización central en cada listado y cada solicitud de descarga. El servidor comprueba el rol asignado y activo; el menú no es el control de seguridad.
- URL HTTPS firmada para un solo archivo y válida durante cinco minutos. Un enlace ya generado conserva acceso a ese archivo hasta vencer.
- Se revalida que el nombre seleccionado exista en el listado antes de firmarlo; no se firman rutas arbitrarias.
- Respuestas privadas sin caché. No se entregan credenciales S3 ni tokens de superusuario PocketBase al cliente.
- La descarga usa un enlace con `Content-Disposition: attachment`, sin cargar el backup completo en memoria JavaScript.
- La función no crea, elimina ni restaura backups.

Referencia del listado y su formato: [API Backups de PocketBase](https://pocketbase.io/docs/api-backups/).
