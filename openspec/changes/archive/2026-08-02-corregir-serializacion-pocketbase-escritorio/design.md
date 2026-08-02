## Context

El cliente global de PocketBase agrega cabeceras de dispositivo y actor mediante `beforeSend`. Actualmente reconstruye las cabeceras con la API `Headers`; la versión instalada del SDK inspecciona las cabeceras mediante propiedades enumerables de un objeto plano. Al no encontrar `Content-Type`, el SDK omite `JSON.stringify` y `fetch` convierte el cuerpo a `[object Object]`.

La evidencia proviene del registro interno de PocketBase local: autenticación y creación de usuario responden HTTP 400 con `invalid character 'o' looking for beginning of value`. La tabla local `users` permanece vacía.

## Goals / Non-Goals

**Goals:**

- Mantener las cabeceras en una representación que el SDK pueda inspeccionar y serializar.
- Preservar cabeceras existentes sin depender de su capitalización.
- Cubrir con pruebas la serialización de cuerpos y las restricciones de escritura del runtime de escritorio.

**Non-Goals:**

- Cambiar la contraseña central, la derivación de la credencial del usuario activo o los datos descargados desde staging.
- Modificar el esquema de PocketBase local o central.
- Cambiar qué colecciones puede escribir la aplicación de escritorio durante el uso offline normal.

## Decisions

1. **Normalizar las cabeceras a un objeto plano.** El adaptador copiará las entradas existentes y agregará las cabeceras de escritorio en un `Record<string, string>`. Esto conserva la compatibilidad con la inspección interna del SDK y permite que detecte `Content-Type: application/json`. Se descarta devolver una instancia de `Headers` porque es la causa reproducida del fallo.

2. **Extraer una función pura y probar el contrato.** La preparación de solicitudes se aislará del singleton de PocketBase para comprobar cabeceras, restricciones y compatibilidad con la serialización sin depender del navegador ni de una base real. Se descarta una prueba basada únicamente en mocks de `fetch`, porque podría ocultar nuevamente la diferencia entre `Headers` y un objeto enumerable.

3. **Mantener la validación de alcance antes de enviar.** La corrección no alterará `desktopCollectionFromRequest` ni las colecciones habilitadas durante el uso offline normal. La validación distinguirá explícitamente las operaciones acotadas de copia inicial antes de enviar la solicitud.

4. **Limitar a 64 bytes ASCII las credenciales aleatorias de usuarios adicionales.** Se combinarán dos UUID sin guiones para conservar alta entropía con una longitud fija inferior al máximo de 72 bytes de bcrypt. Se descarta concatenar UUID con separador porque produce 73 bytes y PocketBase rechaza el registro.

5. **Verificar el servidor compilado que se incorpora al paquete.** La aplicación portátil se armará desde la salida `standalone` vigente. Cuando Next.js trace el proyecto respecto de una raíz superior y deje el servidor bajo `standalone/tmp/worktrees/<proyecto>`, se promoverá ese directorio a `resources/app` conservando los `node_modules` trazados del nivel superior. Después se inspeccionará el fragmento de sincronización incluido antes de ejecutar. La verificación debe encontrar la generación de 64 bytes y rechazar la expresión anterior de 73 bytes; comprobar sólo el código fuente o el directorio `.next` externo no demuestra qué versión ejecutará el paquete.

6. **Permitir una excepción mínima para la copia inicial central.** Las solicitudes `POST`, `PATCH` o `PUT` sobre `mutuales` podrán atravesar el filtro sólo cuando incluyan `x-consultorio-sync-origin: central`, marca que ya agrega el flujo de activación. `system_settings` queda fuera de esta excepción porque su copia usa el IPC privilegiado específico. La excepción no incluirá eliminaciones, `turnos`, permisos ni otras colecciones administrativas. Se descarta habilitar esas colecciones globalmente porque permitiría administrarlas durante el trabajo offline ordinario.

7. **Resolver la existencia de usuarios ocultos dentro del proceso principal.** Electron expondrá un IPC `local.userExists` que acepta únicamente un ID PocketBase de 15 caracteres y consulta la ruta fija `users/<id>` con el superusuario técnico local. El renderer recibirá sólo `true` o `false`; la contraseña cifrada y el token permanecerán en `main.mjs`. Se descarta ampliar `users.listRule`/`viewRule` porque revelaría todos los usuarios locales durante el uso ordinario, y se descarta ignorar cualquier conflicto de email porque podría ocultar un cambio real de identificador.

8. **Copiar `system_settings` mediante un upsert privilegiado confinado.** La colección conserva `createRule`, `updateRule` y `deleteRule` restringidas a superusuarios. Electron expondrá `local.upsertSystemSetting` únicamente para un registro con ID PocketBase válido, clave de 1 a 120 caracteres y valor JSON con el límite del esquema; el proceso principal fijará la colección y elegirá internamente entre crear o actualizar usando el superusuario técnico. Se descarta abrir las reglas locales porque habilitaría cambios administrativos durante el uso offline, y se descarta un IPC genérico porque permitiría reutilizar el privilegio para otras colecciones o métodos.

## Risks / Trade-offs

- **[Cabeceras duplicadas con distinta capitalización]** → Normalizar las entradas con `Headers` sólo durante la lectura y convertir el resultado final con `Object.fromEntries`, obteniendo claves únicas en un objeto plano.
- **[Regresión en el cliente web]** → La transformación seguirá ejecutándose únicamente cuando exista el runtime de escritorio.
- **[Prueba insuficiente frente a cambios del SDK]** → Verificar además que `Content-Type` sea enumerable y que un cuerpo de objeto termine serializado como JSON al pasar por el cliente PocketBase.
- **[Regresión por longitud de credenciales temporales]** → Probar longitud UTF-8, formato y variación entre generaciones.
- **[Paquete armado con una salida standalone anterior]** → Comparar explícitamente el fragmento compilado del paquete con la lógica vigente antes de realizar la prueba manual.
- **[Salida standalone anidada por la raíz inferida]** → Exigir `resources/app/server.js` y `resources/app/.next/BUILD_ID` después de promover el proyecto trazado; no aceptar únicamente la existencia del directorio `standalone`.
- **[Excepción de bootstrap demasiado amplia]** → Validar conjuntamente colección, método y valor exacto de la cabecera; probar que escrituras normales, eliminaciones y otras colecciones administrativas sigan bloqueadas.
- **[IPC privilegiado reutilizable para otros datos]** → Fijar la colección `users`, validar el ID antes de efectuar red y devolver sólo un booleano; no aceptar rutas, métodos ni cuerpos arbitrarios desde el renderer.
- **[Token técnico local vencido]** → Renovarlo únicamente dentro del proceso principal cuando PocketBase responda 401 o 403, sin registrarlo ni enviarlo al renderer.
- **[IPC de configuración reutilizable fuera del bootstrap]** → No aceptar colección, ruta ni método; validar y reconstruir el único payload permitido antes de enviarlo a la ruta fija de `system_settings`.

## Migration Plan

1. Publicar la corrección en una nueva compilación de escritorio y verificar el fragmento de sincronización dentro de `resources/app`.
2. Cerrar la compilación anterior y abrir la nueva conservando `userData` y la base local.
3. Repetir la activación; el usuario activo ya creado se reutilizará, los usuarios adicionales pendientes se copiarán con credenciales compatibles y la configuración se guardará con el upsert técnico confinado.
4. Ante una regresión, volver a la compilación anterior sin modificar los datos locales.
