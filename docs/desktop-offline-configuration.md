# Configuración de la versión de escritorio offline

## Variables del servidor central

La aplicación web central conserva las variables existentes:

- `NEXT_PUBLIC_POCKETBASE_URL`: URL pública HTTPS de PocketBase usada por el navegador web.
- `POCKETBASE_URL`: URL de PocketBase usada por Route Handlers y scripts del servidor.
- `POCKETBASE_ADMIN_EMAIL` y `POCKETBASE_ADMIN_PASSWORD`, o `POCKETBASE_ADMIN_TOKEN`: credenciales exclusivamente del servidor para tareas administrativas.

Los endpoints de sincronización agregarán:

- `DESKTOP_SYNC_ENABLED`: interruptor explícito para permitir activaciones y sincronización.
- `DESKTOP_SYNC_PUBLIC_URL`: origen HTTPS de la aplicación Next.js central al que se conectará Electron.
- `DESKTOP_SYNC_DEVICE_LIMIT`: máximo de dispositivos habilitados por instalación/cliente.

Nunca se deben incluir credenciales administrativas de PocketBase en el instalador, variables `NEXT_PUBLIC_*`, logs ni respuestas de API.

## Variables y estado de cada PC

Electron conserva bajo el perfil del usuario de Windows:

- `device_id` y código corto del equipo.
- URL central pública y puertos loopback elegidos para Next.js/PocketBase local.
- Token central y credenciales técnicas locales cifrados con `safeStorage`.
- Base PocketBase local, cola, cursores, conflictos y logs sanitizados.

La contraseña del médico no se guarda de forma reversible. Se entrega a PocketBase local durante una activación online para que el backend local almacene su verificador.

## Relevamiento seguro del backend

El comando siguiente es de sólo lectura, usa `.env.local` y no imprime credenciales:

```powershell
node scripts/inspect_pocketbase_sync_baseline.mjs --env .env.local
```

El resultado informa salud, generación de API administrativa, firma SHA-256 del esquema y campos/reglas de `users`, `mutuales`, `pacientes`, `consultas` y `recetas`. PocketBase no garantiza que `/api/health` publique el número exacto del ejecutable; si `reportedVersion` es `null`, la versión debe confirmarse en el artefacto o comando de despliegue antes de fijar el binario local.

## Reglas de seguridad operativa

- Exponer PocketBase local sólo en `127.0.0.1`, nunca en `0.0.0.0`.
- Mantener Windows, la aplicación y PocketBase actualizados mediante versiones probadas y fijadas.
- Habilitar BitLocker en equipos con información clínica local.
- No borrar el directorio de datos mientras existan pendientes o conflictos.
- Hacer el piloto y toda migración primero contra `.env.test.local`.

## Activación de un equipo

1. Habilitar `DESKTOP_SYNC_ENABLED=true` en la aplicación Next.js central y aplicar el esquema con `npm run schema:desktop-sync` primero en testing.
2. Instalar la aplicación con un usuario de Windows individual y abrirla con Internet disponible.
3. Ingresar las URL HTTPS de la aplicación Next.js central y de PocketBase central, un nombre reconocible para el equipo y las credenciales del usuario.
4. Esperar a que termine la copia inicial. Si se interrumpe, volver a abrir y repetir: registro, páginas y escrituras locales son idempotentes.
5. Comprobar en `/sincronizacion` que no existan errores ni conflictos y realizar una prueba offline controlada.

Deshabilitar un registro en `sync_devices` revoca nuevas sincronizaciones. La copia local debe conservarse hasta que un responsable confirme que no hay operaciones pendientes.

## Copias de seguridad y recuperación

- Cerrar la aplicación antes de copiar su directorio de datos para obtener una imagen consistente.
- Respaldar el directorio de usuario de la aplicación que contiene `pocketbase/pb_data`, `secure`, `device.json` y `logs`.
- Cifrar el destino del respaldo y limitar su acceso; la base contiene información clínica.
- Probar periódicamente la restauración en una PC aislada y sin acceso al servidor central.
- Ante pérdida de una PC, deshabilitar inmediatamente su registro en `sync_devices` y cambiar credenciales del usuario afectado.
- Para recuperar un equipo, restaurar datos sólo en el mismo perfil de Windows cuando se necesiten secretos protegidos por DPAPI. Si no es posible, realizar una activación nueva y conservar la copia antigua como evidencia hasta revisar pendientes.

## BitLocker, actualizaciones y desinstalación

- BitLocker es un requisito operativo recomendado para el volumen que contiene el perfil de Windows.
- El instalador NSIS actualiza archivos de programa sin eliminar el directorio de datos del usuario.
- La desinstalación tampoco borra automáticamente la base local. El borrado definitivo requiere revisión de pendientes, respaldo y autorización explícita.
- Antes de actualizar PocketBase o Electron, repetir migraciones, smoke test empaquetado y piloto offline contra testing.

## Firma del instalador

La firma Authenticode es opcional durante desarrollo pero recomendada para la entrega. Configurar el certificado mediante las variables seguras admitidas por `electron-builder`; nunca guardar el PFX ni su contraseña en el repositorio. Registrar hash SHA-256, versión, fecha y responsable de cada instalador entregado.
