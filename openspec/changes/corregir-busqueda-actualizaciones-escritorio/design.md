## Context

El runtime de Electron recibe la URL central únicamente desde `DESKTOP_CENTRAL_URL` o `NEXT_PUBLIC_APP_URL`. Esas variables existen durante algunos builds, pero no forman parte del entorno de un proceso abierto normalmente desde Windows. La activación ya persiste cifrados `centralAppUrl` y `centralPocketBaseUrl`, y el ingreso online ya conserva el token central; sin embargo, el actualizador no consulta esa fuente durable.

La salida temprana por falta de URL o token devuelve un estado `idle` con `auth_required`. El componente visual resume todo estado `idle` como `Buscar actualizaciones`, de modo que el clic no deja evidencia para el usuario ni en el log.

## Goals / Non-Goals

**Goals:**

- Resolver una URL HTTPS central válida en una instalación empaquetada aunque Windows no defina variables de entorno.
- Mantener la configuración cifrada de activación como única fuente durable adicional, sin duplicar secretos.
- Comunicar y registrar de forma sanitizada cada resultado de búsqueda manual o automática.
- Mantener la búsqueda y descarga desacopladas del estado de sincronización clínica.
- Cubrir las decisiones con pruebas unitarias y conservar el empaquetado actual.

**Non-Goals:**

- Corregir en este cambio la receta legacy que actualmente deja la sincronización clínica en estado offline.
- Cambiar el formato firmado del release, el gateway, iDrive e2 o la promoción entre `pilot` y `stable`.
- Migrar PocketBase, modificar datos clínicos o introducir nuevas credenciales.

## Decisions

1. **Resolver la URL en una función pura y validada.** El runtime dará prioridad a una URL explícita de entorno y usará como fallback `centralAppUrl` leído de `desktop-activation`. Ambas entradas pasarán por la misma validación HTTPS. Se descarta copiar la URL a un archivo nuevo porque duplicaría configuración sensible y exigiría migración.

2. **Leer la activación sólo en el proceso principal.** `checkDesktopUpdates` obtendrá el secreto cifrado mediante `safeStorage`, extraerá únicamente `centralAppUrl` y nunca registrará el contenido completo. Se descarta depender del renderer porque la búsqueda automática ocurre antes o fuera de una interacción de interfaz.

3. **Distinguir configuración, sesión y conectividad.** La falta de URL devolverá `configuration_required`; la falta o rechazo del token devolverá `auth_required`; los errores de red o servidor conservarán `check_failed`. Cada salida actualizará `checkedAt` y generará una línea sanitizada de diagnóstico.

4. **Hacer visible el resultado en el control existente.** El componente traducirá `configuration_required`, `auth_required`, `up_to_date` y los errores a mensajes accionables. No se agregará un modal bloqueante: la atención clínica local debe continuar.

5. **Probar la regresión en capas.** Las pruebas puras cubrirán precedencia y parsing de configuración; las pruebas del componente o de su función de presentación cubrirán los mensajes. Los controles existentes validarán lint, TypeScript, pruebas, build y empaquetado.

## Risks / Trade-offs

- **[Activación cifrada ausente o corrupta]** → devolver un estado visible de configuración requerida sin impedir el inicio ni leer datos clínicos.
- **[Token central vencido]** → informar que se requiere volver a iniciar sesión y conservar la versión instalada.
- **[URL de entorno incorrecta prevalece sobre una activación válida]** → validar HTTPS y mantener la precedencia explícita para operadores; el diagnóstico identificará la fuente sin registrar la URL completa.
- **[El equipo piloto sigue en `0.1.3`]** → publicar la corrección en una versión posterior y usar una única ejecución asistida con la URL temporal o ejecutar el instalador encima de la versión existente, sin desinstalar ni borrar datos.

## Migration Plan

1. Publicar la corrección sólo en `pilot` y conservar `stable` sin cambios.
2. Permitir que el equipo piloto llegue a la versión corregida mediante un arranque asistido o una instalación sobre la existente.
3. Verificar búsqueda, descarga, posposición, respaldo, reinicio y salud posterior.
4. Promover a `stable` únicamente después de la comprobación manual.

El rollback consiste en conservar el puntero estable anterior y no promover el release piloto. No hay migración de datos que revertir.

## Open Questions

No quedan decisiones abiertas para la implementación. La corrección de la receta legacy se tratará en un cambio separado.
