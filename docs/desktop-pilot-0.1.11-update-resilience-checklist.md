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
- [x] La suite completa de sincronización, autorización, integridad y política finaliza correctamente (144/144, 2026-08-23).

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

- [ ] Una sesión vencida produce un mensaje de autenticación, no un falso estado sin conexión.
- [ ] No se registra ni muestra el token.
- [ ] Volver a iniciar sesión permite reintentar y conserva la operación pendiente.

### 4.3 URL prefirmada expirada

- [ ] Una URL local de ensayo expirada no descarga ni instala contenido parcial.
- [ ] La aplicación permite solicitar una URL nueva y reintentar.
- [ ] El trabajo local permanece disponible.

### 4.4 Manifiesto alterado

- [ ] Una copia local alterada del manifiesto falla la verificación de firma.
- [ ] No se reemplaza el puntero válido de `pilot` ni se toca `stable`.
- [ ] No se invoca el instalador.

### 4.5 Descarga corrupta

- [ ] Una copia local corrupta del instalador falla tamaño o SHA-512.
- [ ] El archivo corrupto no queda marcado como listo.
- [ ] No se invoca el instalador y el trabajo local permanece disponible.

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
- La prueba sin red produjo un estado recuperable, mantuvo disponible la interfaz local y conservó la operación. Esta evidencia cubre el caso 4.1; los otros cinco casos de la tarea 7.4 continúan pendientes.

Las capturas fueron aportadas por el responsable del piloto. No se copiaron nombres, documentos, contenido clínico, tokens, secretos ni URLs prefirmadas a esta evidencia.
