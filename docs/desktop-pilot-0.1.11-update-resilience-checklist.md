# Piloto de escritorio 0.1.11: continuidad y fallos de actualización

Este procedimiento cierra las comprobaciones operativas pendientes de las tareas 7.3 y 7.4 del cambio OpenSpec `agregar-actualizaciones-automaticas-escritorio`.

La versión `0.1.11` será una versión técnica posterior a `0.1.10`, publicada únicamente en `pilot`. No promoverla a `stable` durante este ensayo.

## Alcance y reglas de seguridad

- Equipo autorizado: `PC-E24D57F3`.
- Plataforma: Windows 11 x64.
- Canal: `pilot`.
- Usar exclusivamente datos sintéticos de staging.
- Mantener un solo equipo asignado al canal `pilot`.
- No degradar ni desinstalar la aplicación actual.
- No alterar objetos válidos del canal `stable`.
- No copiar tokens, URLs prefirmadas, secretos ni contenido clínico a la evidencia.
- Ejecutar las pruebas destructivas de integridad únicamente con copias locales aisladas del manifiesto y del instalador.

Ante pérdida de datos, cierre inesperado, cambio de identidad, conflicto no explicado o imposibilidad de verificar el respaldo, detener el ensayo y no promover la versión.

## 1. Cobertura automática previa

La suite `npm run test:sync-core` debe quedar en verde. En particular, ya existen pruebas automatizadas para:

| Riesgo | Prueba principal | Resultado esperado |
| --- | --- | --- |
| Token central vencido | `lib/desktop-updates/policy.test.ts` | Rechazo `invalid_session` sin filtrar credenciales |
| URL prefirmada expirada | `lib/desktop-updates/gateway.test.ts` | Cada reintento autorizado genera una URL nueva y de vida corta |
| Manifiesto alterado | `desktop/update-integrity.test.mjs` | Firma Ed25519 inválida y actualización rechazada |
| Descarga corrupta | `desktop/update-integrity.test.mjs` | Tamaño o SHA-512 inválido y artefacto rechazado |
| Respaldo alterado | `desktop/update-backup.test.mjs` | Respaldo inválido y actualización bloqueada |
| Actualización obligatoria | `desktop/update-client-policy.test.mjs` | Instalación sólo al cerrar y con artefacto verificado |
| Posposición | `desktop/update-client-policy.test.mjs` | Recordatorio de una actualización normal después de 24 horas |

- [x] `npm run test:sync-core` finaliza correctamente (141/141, 2026-08-17).
- [x] `npm run lint` finaliza correctamente (2026-08-17).
- [x] `npx tsc --noEmit` finaliza correctamente (2026-08-17).
- [x] `npm run build` finaliza correctamente con Next.js 16.3.0 (2026-08-17).
- [x] La validación OpenSpec estricta finaliza correctamente (2026-08-17).
- [x] La suite completa de sincronización, autorización, integridad y política finaliza correctamente (153/153, 2026-08-23).

## 2. Preparación del piloto

- [x] La aplicación instalada informa versión `0.1.10`.
- [x] El equipo `PC-E24D57F3` está habilitado y asignado a `pilot`.
- [x] La sincronización inicial muestra `0` pendientes, `0` errores y `0` conflictos.
- [ ] Se exportó un diagnóstico previo sanitizado.
- [ ] Se registró la versión del canal `stable` y no se modificará durante la prueba.
- [ ] Se seleccionó un paciente sintético sin consultas ni recetas reales asociadas.

## 3. Operación pendiente durante la actualización

1. Desconectar la red del equipo piloto.
2. Crear o editar un dato sintético permitido y comprobar que queda exactamente `1` operación pendiente.
3. Restablecer la red sin sincronizar todavía.
4. Publicar `0.1.11` únicamente en `pilot`.
5. Presionar `Buscar actualizaciones` y esperar a que `0.1.11` quede lista.
6. Presionar `Más tarde` y comprobar que la aplicación continúa operativa, conserva la operación pendiente y no instala la versión.
7. Volver a buscar la actualización para continuar el ensayo sin esperar 24 horas.
8. Esperar la descarga completa y presionar `Reiniciar y actualizar`.
9. Confirmar que la aplicación reabre en `0.1.11`, con la misma identidad y la operación todavía pendiente.
10. Sincronizar y confirmar el dato sintético tanto en escritorio como en staging.

- [x] La detección y la descarga son visibles.
- [x] `Más tarde` no cierra la aplicación ni elimina trabajo local.
- [x] Se crea y verifica un respaldo antes de invocar el instalador.
- [x] El reinicio no requiere desinstalación manual.
- [x] Se conservan sesión, activación, identidad, base local y accesos directos.
- [x] La operación pendiente se confirma después de actualizar y sincronizar.
- [x] El estado final queda en `0` pendientes, `0` errores y `0` conflictos.

## 4. Matriz de fallos aislados

Cada caso se ejecuta por separado. Restaurar el estado limpio antes del siguiente caso y conservar una operación sintética pendiente para demostrar que el trabajo local no se pierde.

### 4.1 Falta de red

- [x] Buscar actualizaciones sin red muestra un estado recuperable.
- [x] La interfaz clínica sigue disponible y conserva la operación pendiente.
- [x] Al recuperar la red, una nueva búsqueda funciona sin reinstalar ni reiniciar.

### 4.2 Sesión central vencida

- [x] Una sesión vencida produce un mensaje de autenticación, no un falso estado sin conexión.
- [x] No se registra ni muestra el token.
- [x] Volver a iniciar sesión permite reintentar la búsqueda de actualizaciones.
- [x] Pacientes, consultas y recetas permanecen accesibles durante la prueba.
- [x] Repetir el caso con una operación sintética pendiente y confirmar que se conserva.

### 4.3 URL prefirmada expirada

La comprobación operativa se ejecuta dentro del contenedor de **staging** desplegado desde esta versión. Usa sólo el canal `pilot`, lee el puntero y manifiesto vigentes, solicita un byte del instalador y cancela el cuerpo inmediatamente. No escribe objetos, no reemplaza punteros y no imprime URLs ni credenciales.

```sh
cd /app && node scripts/verify_desktop_expired_url.mjs
```

El resultado aprobado debe informar una URL vencida rechazada y una URL nueva aceptada, junto con canal, versión, artefacto y códigos HTTP sanitizados. Antes y después de ejecutarlo, confirmar visualmente que la aplicación de escritorio sigue disponible y conserva cualquier operación sintética pendiente.

- [x] Una URL prefirmada de ensayo expirada no descarga ni instala contenido parcial.
- [x] La aplicación permite solicitar una URL nueva y reintentar.
- [x] El trabajo local permanece disponible.

### 4.4 Manifiesto alterado

La comprobación operativa se ejecuta dentro del contenedor de **staging** desplegado desde esta versión. Lee únicamente el puntero, manifiesto y firma vigentes de `pilot`, valida la firma auténtica y altera el SHA-512 de una copia mantenida en memoria. No genera URLs, no descarga el instalador y no dispone de ninguna operación de escritura sobre el bucket.

```sh
cd /app && node scripts/verify_desktop_tampered_manifest.mjs
```

El resultado aprobado debe informar que el manifiesto auténtico fue aceptado y que la copia alterada fue rechazada. Antes y después de ejecutarlo, confirmar visualmente que la aplicación de escritorio y el trabajo local continúan disponibles.

- [x] Una copia local alterada del manifiesto falla la verificación de firma.
- [x] No se reemplaza el puntero válido de `pilot` ni se toca `stable`.
- [x] No se invoca el instalador.

### 4.5 Descarga corrupta

La comprobación operativa se ejecuta dentro del contenedor de **staging** desplegado desde esta versión. Valida la firma del manifiesto auténtico de `pilot`, selecciona exclusivamente el instalador `.exe` y lee como máximo 64 KiB del objeto mediante una solicitud de rango. Esa muestra se guarda con el nombre esperado en un directorio temporal y la barrera real de integridad debe rechazarla por tamaño o SHA-512. El temporal se elimina siempre.

El verificador es de sólo lectura: no descarga el instalador completo, no genera ni imprime URLs, no marca ninguna actualización como lista, no invoca el instalador y no modifica objetos ni punteros del bucket.

```sh
cd /app && node scripts/verify_desktop_corrupt_download.mjs
```

El resultado aprobado debe informar el canal, versión, instalador, cantidad acotada de bytes y el rechazo por tamaño o SHA-512. Antes y después de ejecutarlo, confirmar visualmente que la aplicación de escritorio y el trabajo local continúan disponibles.

Evidencia del 23/08/2026 en staging: el verificador aprobó el canal `pilot`, versión `0.1.11`, artefacto `Consultorio-Oftalmologico-0.1.11-x64.exe`. Leyó una muestra temporal de 65.536 bytes sobre 179.302.406 bytes esperados y la barrera real de integridad la rechazó por tamaño. El verificador confirmó que la copia no quedó lista, eliminó el temporal, no invocó el instalador y no modificó objetos ni punteros. Después de la prueba se confirmó manualmente que la aplicación y el trabajo local permanecían disponibles.

- [x] Una copia local corrupta del instalador falla tamaño o SHA-512.
- [x] El archivo corrupto no queda marcado como listo.
- [x] No se invoca el instalador y el trabajo local permanece disponible.

### 4.6 Actualización obligatoria

- [ ] Mientras la aplicación está abierta, una actualización obligatoria informa su estado sin cerrar la sesión clínica.
- [ ] La instalación comienza únicamente después de que el usuario cierre la aplicación.
- [ ] Sólo se instala un artefacto descargado y verificado.
- [ ] Tras reabrir, se conservan identidad, datos locales y operación pendiente.

## 5. Evidencia y decisión

Registrar sin secretos:

- tag, commit y ejecución de GitHub Actions;
- versión de origen y destino;
- nombre, tamaño y digest del artefacto;
- hora de cada caso;
- resultado, mensaje técnico sanitizado y recuperación;
- conteos de pendientes, errores y conflictos antes y después;
- ubicación y verificación del respaldo;
- confirmación de que `stable` no cambió.

- [ ] Se exportó un diagnóstico posterior sanitizado.
- [ ] Los seis casos de fallo quedaron aprobados.
- [x] El ciclo con operación pendiente quedó aprobado.
- [ ] El resultado se registró como aprobado o rechazado.

Sólo si todo lo anterior queda aprobado se puede iniciar la tarea 7.5: promover exactamente los mismos bytes a `stable` y actualizar los demás equipos uno por uno.

## 6. Evidencia del ciclo aprobado para la tarea 7.3

Fecha: 2026-08-23

- Etiqueta: `desktop-v0.1.11` (tag anotado sobre el commit `fed6e57ec5693d5cc61f4028509ba150189b25f0`).
- Ejecución de publicación piloto: https://github.com/carlosacostap-unca/consultorio-oftalmologico/actions/runs/32575898695, concluida correctamente.
- Equipo piloto: `PC-E24D57F3`, Windows 11 x64.
- Versión de origen y destino: `0.1.10` → `0.1.11`.
- La interfaz detectó y descargó la versión, permitió elegir `Más tarde` y conservó una operación local pendiente al trabajar sin conexión.
- Después de `Reiniciar y actualizar`, la aplicación abrió en `0.1.11` con la misma sesión e identidad y mantuvo exactamente una operación pendiente, sin errores ni conflictos.
- Al recuperar conectividad, la operación se sincronizó y el estado final quedó en `0` pendientes, `0` errores y `0` conflictos. El responsable confirmó el dato en escritorio y staging.
- El respaldo `backup-2026-08-23T21-35-22-829Z-b6821b2a` declara origen `0.1.10`, destino `0.1.11` y 12 archivos. `verifyDesktopBackup` volvió a validar estructura, archivos requeridos, tamaños y SHA-512.
- La prueba sin red produjo un estado recuperable, mantuvo disponible la interfaz local y conservó la operación. Esta evidencia cubre el caso 4.1. El caso 4.2 también quedó aprobado con una operación sintética pendiente: la sesión vencida impidió el envío, la operación permaneció disponible para revisión y se aplicó después de volver a iniciar sesión. El caso 4.3 quedó aprobado mediante la evidencia operativa de la sección 9 y el caso 4.4 mediante la sección 10. Los casos 4.5 y 4.6 continúan pendientes.

## 7. Cobertura automatizada complementaria de la tarea 7.4

La simulación automatizada no reemplaza las casillas operativas de la sección 4, pero reduce el riesgo antes de ejecutarlas sobre el equipo piloto:

- Una respuesta central `401` o `403` se clasifica como `auth_required`, no como falta de red.
- El estado público enviado al renderer descarta cualquier token u otro campo no permitido.
- La interfaz traduce `auth_required` a `Volvé a iniciar sesión para buscar actualizaciones` y no muestra `Sin conexión`.
- Una respuesta `200` posterior a la reautenticación vuelve a habilitar la continuación normal de la consulta.
- Los reintentos de descarga solicitan una URL prefirmada nueva; las pruebas de integridad rechazan manifiestos alterados y artefactos corruptos; la política obligatoria sólo habilita la instalación de una versión ya verificada.

Las capturas fueron aportadas por el responsable del piloto. No se copiaron nombres, documentos, contenido clínico, tokens, secretos ni URLs prefirmadas a esta evidencia.

## 8. Evidencia operativa de sesión central vencida

Fecha: 2026-08-23

- Se aisló de forma reversible únicamente el archivo cifrado de la sesión central del equipo piloto. No se leyó, descifró, registró ni mostró su contenido.
- La búsqueda manual de actualizaciones pidió volver a iniciar sesión y no presentó un falso estado `Sin conexión`.
- Pacientes, consultas y recetas permanecieron disponibles mientras faltaba la sesión central.
- Después de iniciar sesión nuevamente, la aplicación creó una credencial cifrada nueva y la búsqueda manual informó que la aplicación estaba actualizada.
- Antes de limpiar el ensayo se verificó que la credencial nueva existiera. Luego se eliminó únicamente el respaldo temporal de la credencial anterior; no se modificaron activación, identidad, base local ni secretos restantes.
- La cobertura automatizada complementaria verifica respuestas centrales `401` y `403`, sanitización del estado público y continuación normal tras una respuesta posterior `200`.
- El canal `stable` no se modificó durante esta prueba.
- Se repitió la variante con un alta sintética pendiente. Sin sesión central, la aplicación mantuvo el registro local y mostró una operación `create` en estado de error para revisión, sin confundirla con una pérdida de conectividad.
- Después de volver a iniciar sesión, `Sincronizar ahora` procesó la misma operación, asignó una ficha definitiva y dejó el estado en `0` pendientes, `0` errores y `0` conflictos.
- El registro sintético se eliminó en línea y su baja se sincronizó al terminar el ensayo, sin dejar pendientes, errores ni conflictos.
- La existencia de la credencial cifrada nueva y del respaldo temporal se comprobó sin leer sus contenidos. Después de limpiar el registro sintético se eliminó exclusivamente `central-auth-token.expired-session-pending-test.bin`; la credencial cifrada nueva permaneció disponible.

## 9. Evidencia operativa de URL prefirmada expirada

Fecha: 2026-08-23

- La comprobación se ejecutó dentro del contenedor de staging desplegado desde el merge del PR `#84` (`21a99b97e2d6f342ca907c396d9a9f786000a6b2`).
- Se consultó exclusivamente el canal `pilot`, versión `0.1.11`, y el artefacto `Consultorio-Oftalmologico-0.1.11-x64.exe`.
- Una URL prefirmada con vigencia de un segundo fue rechazada después de expirar con HTTP `403`; no descargó ni habilitó contenido parcial.
- El verificador solicitó una URL nueva para el mismo objeto y una lectura de rango de un byte fue aceptada con HTTP `206`. El cuerpo se canceló inmediatamente y no se descargó el instalador completo.
- El comando informó de forma sanitizada el canal, la versión, el nombre del artefacto y los códigos HTTP. No imprimió URLs prefirmadas, credenciales ni contenido clínico.
- La verificación fue de sólo lectura: no modificó objetos, punteros de `pilot` ni el canal `stable`.
- Antes y después del ensayo, el responsable confirmó que la aplicación de escritorio permaneció operativa y que los datos y el trabajo local continuaron disponibles.
- El caso 4.3 queda aprobado. Los casos 4.5 y 4.6 continúan pendientes y no se autoriza todavía la promoción a `stable`.

## 10. Evidencia operativa de manifiesto alterado

Fecha: 2026-08-23

- La comprobación se ejecutó dentro del contenedor de staging desplegado desde el merge del PR `#86` (`4684d1f5cc6536d46bdf9c66d2d5cb74c09b92b0`).
- Se consultó exclusivamente el canal `pilot`, versión `0.1.11`, y el artefacto de metadatos `builder-debug.yml` referenciado por el manifiesto vigente.
- La firma Ed25519 del manifiesto auténtico fue aceptada.
- Se alteró únicamente el SHA-512 de una copia mantenida en memoria y la firma Ed25519 original fue rechazada para esa copia.
- No se generaron URLs de descarga, no se descargó ni invocó el instalador y no se modificaron objetos ni punteros de `pilot` o `stable`.
- La salida fue sanitizada: informó canal, versión, artefacto y resultados criptográficos sin imprimir credenciales, firmas completas, claves ni contenido clínico.
- Antes y después del ensayo, el responsable confirmó que la aplicación de escritorio permaneció operativa y que pacientes, consultas, recetas, datos y trabajo local continuaron disponibles.
- El caso 4.4 queda aprobado. Los casos 4.5 y 4.6 continúan pendientes y no se autoriza todavía la promoción a `stable`.
