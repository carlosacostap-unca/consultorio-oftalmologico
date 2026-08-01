## Context

La aplicación actual es una aplicación Next.js 16 con componentes cliente que consultan directamente una instancia PocketBase remota y algunos Route Handlers que aplican reglas sensibles con credenciales administrativas. Esa dependencia directa de la red impide abrir fichas o registrar una atención durante un corte. La versión comercial aceptada debe estar instalada en cada PC con Windows 11, mantener una copia operativa por equipo y considerar a la instancia central como verdad autoritativa.

El alcance funcional de esta etapa está limitado a pacientes, consultas y recetas. Sin embargo, la copia inicial también necesita los usuarios habilitados y datos de referencia mínimos, como médicos y mutuales, para presentar relaciones existentes sin permitir su administración offline. Los datos clínicos son sensibles: toda sincronización debe identificar al actor y al equipo, ser idempotente y conservar una vía de revisión cuando una fusión automática no sea segura.

## Goals / Non-Goals

**Goals:**

- Entregar una aplicación instalable y ejecutable desde un acceso directo en Windows 11.
- Reutilizar la interfaz y el modelo PocketBase actuales con la menor divergencia posible entre web y escritorio.
- Permitir autenticación offline de usuarios activados previamente, sin almacenar contraseñas reversibles.
- Mantener localmente pacientes, consultas y recetas; permitir su lectura, creación y edición sin conexión; conservar impresiones basadas en esos datos.
- Enviar operaciones locales y descargar cambios centrales con idempotencia, cursores durables y trazabilidad por usuario/equipo.
- Resolver automáticamente sólo cambios inequívocamente compatibles y exponer los demás como conflictos.
- Preservar los datos locales y la cola pendiente durante actualizaciones o reinstalaciones de la aplicación.

**Non-Goals:**

- Sincronizar turnos, horarios, bloqueos, configuraciones, permisos, archivos adjuntos o correos en esta etapa.
- Permitir altas o cambios de mutuales, usuarios, roles o configuración mientras no haya conexión.
- Reemplazar PocketBase central, cambiar el proveedor de infraestructura o construir sincronización entre PCs por red local.
- Fusionar automáticamente decisiones clínicas concurrentes, resolver automáticamente pacientes probablemente duplicados o ocultar operaciones rechazadas.
- Soportar macOS, Linux o versiones de Windows anteriores a Windows 11.
- Incluir firma comercial del instalador; se dejará preparado el proceso para usar un certificado cuando el cliente lo provea.

## Decisions

### 1. Electron como contenedor y Next.js en modo standalone

Se usará Electron con aislamiento de contexto, `nodeIntegration` deshabilitado y un `preload` mínimo. El proceso principal iniciará un servidor Next.js standalone sólo en loopback, iniciará PocketBase local en otro puerto loopback y abrirá una ventana hacia el servidor local. El instalador se generará con `electron-builder` en formato NSIS por usuario.

Esta alternativa permite reutilizar React, TypeScript, las rutas y la impresión actual, y mantiene en JavaScript/TypeScript la mayor parte del trabajo. Se descarta Tauri para esta primera entrega porque introducir Rust y un segundo ecosistema aumentaría el riesgo del plazo. Se descarta una PWA porque no satisface el instalador nativo ni brinda el mismo control sobre procesos, secretos, base local y actualizaciones.

### 2. PocketBase local en lugar de un segundo modelo SQLite propio

Cada instalación incluirá una versión fijada del ejecutable PocketBase y un esquema local compatible con las colecciones utilizadas. PocketBase escuchará exclusivamente en `127.0.0.1` con un puerto elegido por el proceso principal. El directorio de datos vivirá bajo `app.getPath("userData")` y no dentro del directorio reemplazable de la aplicación.

En escritorio, `lib/pocketbase.ts` resolverá el URL local expuesto por el `preload`; en web conservará `NEXT_PUBLIC_POCKETBASE_URL`. Los Route Handlers que necesiten la base local recibirán el URL mediante variables del proceso lanzado. Usar PocketBase local evita duplicar consultas, expansiones, reglas de tipos y formatos de fecha en un ORM nuevo. Se descarta SQLite directo porque obligaría a reimplementar gran parte del acceso a datos y mantener dos modelos divergentes.

Las credenciales administrativas locales serán aleatorias, distintas por equipo y cifradas mediante `safeStorage` de Electron. El archivo de datos y los secretos quedarán bajo los permisos del usuario de Windows; se recomendará BitLocker para cifrado completo en reposo. Ningún puerto se expondrá en interfaces de red.

### 3. Activación online y sesión offline local

La primera activación exigirá conexión. El usuario ingresará email y contraseña contra PocketBase central; la aplicación validará que su rol pueda usar los módulos incluidos, descargará su perfil y creará/actualizará el usuario equivalente en la base local. Antes de entregarla a PocketBase local, la aplicación derivará en memoria una credencial separada por equipo y dominio a partir de la contraseña ingresada; la contraseña central no se almacenará y PocketBase local conservará sólo el verificador de esa credencial derivada. El token central se cifrará con `safeStorage` para sincronizar y se renovará cuando exista conexión.

Los usuarios que sólo usaban Google deberán configurar primero una contraseña propia, tal como recomienda la propuesta comercial. El ingreso offline se hará contra `users` local y conservará email, id central, roles y atribución médica. La desactivación central se aplicará en la siguiente sincronización; hasta entonces sólo podrá ingresar un usuario ya activado en ese equipo. Se mostrará claramente cuándo la sesión está operando sin validación central reciente.

### 4. Cola de operaciones durable y registros con identidad estable

Las colecciones locales de pacientes, consultas y recetas conservarán los mismos IDs PocketBase que el servidor. Las creaciones locales generarán IDs compatibles antes de guardar para que las relaciones no cambien al sincronizar. Hooks locales, fijados y probados contra la versión incluida de PocketBase, registrarán en `sync_operations` cada alta, edición o baja lógica realizada por la interfaz. Las aplicaciones de cambios provenientes del servidor llevarán una marca interna para que los hooks no generen operaciones de eco.

Cada operación contendrá `operation_id`, entidad, registro, acción, payload normalizado, campos cambiados, instantánea/fecha base, actor central, dispositivo, fecha local, estado, intentos y último error. El envío será FIFO por dependencias: paciente antes que su consulta y consulta antes que su receta. El servidor conservará `sync_applied_operations` para devolver el mismo resultado si una operación se reintenta.

Las bajas de entidades sincronizadas serán lógicas mediante metadatos `sync_deleted`, `sync_deleted_at` y `sync_deleted_by`; esto permite propagarlas y evita que una eliminación desaparezca del cursor. La interfaz normal omitirá registros eliminados. Las purgas físicas quedan fuera de esta etapa.

### 5. Protocolo central autenticado: push y luego pull

Se agregarán Route Handlers centrales versionados bajo `/api/desktop-sync/v1` para activación/bootstrap, push por lotes, pull por cursor, estado y resolución de conflictos. El proceso principal de Electron llamará al URL HTTPS configurado de la aplicación central con el token central del usuario y un identificador de dispositivo. Los handlers validarán primero el token con PocketBase y luego aplicarán autorización explícita antes de usar el cliente administrativo existente.

Una sincronización ejecutará:

1. Verificación de conectividad y renovación de sesión central.
2. Envío de un lote acotado de operaciones pendientes en orden de dependencia.
3. Confirmación local, incluyendo mapeo de ficha provisoria a definitiva.
4. Descarga paginada de cambios de pacientes, consultas y recetas posteriores al cursor durable de cada colección, ordenados por `(updated,id)`.
5. Aplicación local sin eco, avance atómico de cursores y actualización del estado visible.

El push será idempotente por `operation_id`. El pull podrá repetirse sin alterar el resultado porque cada registro conserva el mismo ID y se aplica como upsert. Los lotes tendrán límites y backoff exponencial; una falla no descartará la operación ni adelantará su cursor.

### 6. Versiones base y política de conflictos

Toda edición local conservará la instantánea y el `updated` central sobre los que se inició. En el push, el servidor compara esa base con el registro vigente:

- Si no cambió, aplica la operación.
- Para pacientes, si cambió sólo en campos distintos de los editados localmente, fusiona los campos y registra la decisión.
- Para pacientes, si coincide un campo sensible editado por ambos lados, crea un conflicto.
- Para consultas y recetas, cualquier edición concurrente sobre una versión central distinta crea un conflicto conservador; no sobrescribe el registro vigente.
- Para nuevas altas de paciente, coincidencias por documento normalizado o una combinación fuerte de nombre y fecha de nacimiento crean un conflicto de posible duplicado antes de consolidar.

`sync_conflicts` conservará base, versión local, versión central, campos en choque, actor, equipo, estado y resolución. Un usuario autorizado podrá conservar la versión central, aplicar campos locales permitidos o vincular un paciente local con uno central. La resolución genera una nueva operación/versión auditada; nunca modifica silenciosamente la historia.

### 7. Fichas provisorias y definitivas

Cada equipo tendrá un código corto inmutable, por ejemplo `PC1`, y una secuencia local durable. Un paciente creado offline recibirá `TEMP-<CODIGO>-<SECUENCIA>` y una marca de ficha provisoria. Al aceptar la creación, el endpoint central asignará la siguiente ficha definitiva usando la misma regla central protegida contra colisiones, devolverá el valor y la base local actualizará el paciente y todas las vistas relacionadas. La ficha provisoria se preservará en auditoría y no se reutilizará.

### 8. Estado visible, operación manual y recuperación

La barra lateral mostrará conectividad y cantidad de pendientes. `/sincronizacion` mostrará equipo, última sincronización exitosa, operaciones pendientes/en error, conflictos y una acción `Sincronizar ahora`. La sincronización automática se ejecutará al iniciar, periódicamente mientras exista red y al detectar reconexión; la acción manual no abrirá ejecuciones concurrentes.

Los errores se clasificarán en transitorios, autenticación, validación y conflicto. Los transitorios se reintentan; autenticación pide reingreso online; validación queda visible con detalle no sensible; conflicto pasa a revisión. Se ofrecerá exportar un diagnóstico técnico sin contenido clínico completo.

### 9. Pruebas y observabilidad

Las reglas puras de orden, idempotencia, comparación y fusión tendrán pruebas unitarias. Las pruebas de integración levantarán PocketBase local y un backend central de prueba, simularán corte/reconexión y verificarán creación relacionada, reintentos, cursores, fichas y conflictos. Playwright cubrirá el estado visible y los flujos principales. El empaquetado tendrá una prueba smoke en Windows que instala, inicia, conserva datos tras actualizar y desinstala sin borrar datos salvo elección explícita.

Los logs usarán IDs de operación/dispositivo y estados, pero omitirán contraseñas, tokens y cuerpos clínicos. La pantalla mostrará mensajes aptos para usuarios y el log técnico quedará rotado en el directorio de la aplicación.

## Risks / Trade-offs

- [La copia local contiene información clínica sensible] -> Aislar en el perfil de Windows, usar ACL del usuario, cifrar secretos con DPAPI, recomendar BitLocker, bloquear puertos externos y documentar cierre de sesión/equipo.
- [Un token central o usuario queda revocado durante un corte] -> Limitar el acceso offline a usuarios activados, mostrar antigüedad de validación, aplicar revocación al reconectar y permitir una política futura de caducidad configurable.
- [La lógica web existente escribe directamente en PocketBase] -> Mantener compatibilidad mediante el PocketBase local y hooks, y migrar las bajas/operaciones sensibles a servicios compartidos cubiertos por pruebas.
- [Diferencias de versión entre PocketBase local y central] -> Fijar y verificar una versión local compatible, mantener migraciones explícitas y validar el esquema central antes de activar un equipo.
- [El merge por campos puede combinar estados clínicamente inconvenientes] -> Limitar la fusión automática a pacientes y campos disjuntos; tratar consultas y recetas de forma conservadora.
- [Dos altas representan al mismo paciente] -> Detectar documento y coincidencias fuertes antes de crear centralmente; dejar revisión manual y conservar ambos borradores hasta resolver.
- [El instalador sin firma puede mostrar SmartScreen] -> Preparar firma opcional en CI y dejar documentado que el certificado comercial no está incluido.
- [Siete días es un plazo ajustado para cubrir todos los casos reales] -> Entregar por hitos: runtime/activación, CRUD offline, sincronización feliz, conflictos/instalador y validación con datos de prueba; no ampliar dominios en esta etapa.

## Migration Plan

1. Confirmar versión y esquema de PocketBase central; agregar de forma aditiva metadatos de sincronización, bajas lógicas y colecciones auxiliares mediante scripts idempotentes.
2. Desplegar los endpoints centrales y probarlos con PocketBase de test antes de habilitar dispositivos reales.
3. Empaquetar PocketBase local, sus migraciones/hooks y el runtime Electron; verificar que la aplicación web continúe apuntando al backend central.
4. Activar un equipo piloto con Internet, ejecutar bootstrap, comparar conteos y realizar operaciones de prueba sin datos reales nuevos.
5. Simular desconexión, crear paciente/consulta/receta, reconectar y verificar IDs, ficha definitiva, auditoría, pendientes y ausencia de duplicados.
6. Probar conflicto controlado desde web y escritorio; validar resolución y conservación de historial.
7. Generar instalador, actualizar sobre la instalación piloto y verificar persistencia del directorio local.
8. Habilitar los demás equipos uno por vez, registrando código y última sincronización.

Rollback: deshabilitar los endpoints/flag de activación, detener la sincronización y continuar usando la aplicación web central. Como los cambios de esquema son aditivos y toda operación confirmada queda auditada, no se eliminan campos ni colecciones durante el rollback. La base local se conserva para diagnóstico o reintento; ninguna desinstalación automática borrará datos pendientes.

## Open Questions

- URL HTTPS definitiva de la aplicación central que recibirán los instaladores.
- Versión exacta de PocketBase que ejecuta producción, necesaria para fijar el binario y los hooks locales compatibles.
- Código amigable de cada PC y usuarios que deben quedar activados en el piloto.
- Disponibilidad de certificado de firma de código; si no existe, la primera entrega será instalable pero Windows puede mostrar advertencia.
- Política del cliente para caducidad de una sesión offline prolongada y exigencia de BitLocker en los equipos.
