# Evidencia de instalador y piloto offline en Windows 11

Fecha: 2026-08-09

Cambio OpenSpec: `crear-version-escritorio-offline-windows`

Entorno central utilizado: staging/test

Producción: no utilizada ni modificada

## Resultado

El instalador `0.1.1` se instaló sobre una instalación `0.1.0` en Windows 11 Pro y preservó la identidad y los datos existentes. En un perfil aislado se activó un equipo contra staging, se descargó el conjunto completo de datos, se creó un paciente sintético sin conectividad, se reinició la aplicación todavía offline y, al restablecer la conexión, la operación se confirmó automáticamente y la ficha provisoria fue reemplazada por una ficha definitiva. No se registraron conflictos.

## Instalador y actualización

- Sistema operativo: Microsoft Windows 11 Pro `10.0.26200` (build `26200`).
- Versión previa: `0.1.0`.
- Versión instalada y verificada: `0.1.1`.
- Artefacto: `dist-desktop/Consultorio-Oftalmologico-0.1.1-x64.exe`.
- Tamaño: `174999358` bytes.
- SHA-256: `80EB9B0E6B016A57AE26A2516F573870F966AA645B5826E108F9805769C808CA`.
- `app.asar` instalado y construido: SHA-256 `E411EAE240D8A36D168E504EEF22C62D137D669F2FA98F5FE98E395DF5B938D4` en ambos casos.

Antes de actualizar se creó la copia:

`C:\Users\carlo\AppData\Roaming\consultorio-oftalmologico-backups\pre-0.1.1-20260809-112512`

El manifiesto `backup-manifest.json` registra `413` archivos y `1084123670` bytes tanto en origen como en destino. Los hashes de `device.json`, `data.db`, `auxiliary.db` y sus WAL coincidieron al copiar. Después de abrir la versión actualizada, la identidad del equipo permaneció sin cambios y los conteos lógicos del perfil real fueron:

| Colección local | Antes | Después |
| --- | ---: | ---: |
| users | 13 | 13 |
| mutuales | 127 | 127 |
| pacientes | 63934 | 63934 |
| consultas | 207597 | 207597 |
| recetas | 1 | 1 |
| sync_operations | 0 | 0 |
| sync_cursors | 3 | 3 |
| sync_conflicts | 0 | 0 |
| system_settings | 1 | 1 |

## Piloto controlado en staging

Se usó un perfil aislado en `test-results/desktop-smoke-0.1.1/profile-fast`; no se reutilizó el perfil real. El equipo piloto fue:

- `device_id`: `cea5e82b-e04b-4b62-abb8-607a767b7dc4`
- código: `PCCEA5E8`
- nombre: `Piloto Codex Windows 11 Optimizado`
- versión informada al servidor: `0.1.1`

Conteos centrales antes del piloto, registrados a las `2026-08-09T11:39:19-03:00`:

| Colección central | Antes | Después de sincronizar |
| --- | ---: | ---: |
| users | 13 | 13 |
| mutuales | 127 | 127 |
| pacientes | 63936 | 63937 |
| consultas | 207604 | 207604 |
| recetas | 2 | 2 |
| sync_devices | 1 | 3 |
| sync_applied_operations | 0 | 1 |
| sync_conflicts | 0 | 0 |

El total de dispositivos llegó transitoriamente a `3` porque se conservaron durante la medición el dispositivo existente y dos perfiles piloto: uno usado para detectar el cuello de botella inicial y el perfil optimizado usado para completar el ciclo.

## Caso offline verificado

Se utilizó exclusivamente un paciente sintético, sin historia clínica narrativa:

- paciente: `gtqvznstug5lyd6`
- operación: `NMfgGLNwA8gqUxMPdElvawiRyYoNfR8M`
- ficha provisoria: `TEMP-PCCEA5E8-00001`
- ficha definitiva: `64078`

Secuencia observada:

1. Se activó el perfil contra staging y finalizó el bootstrap.
2. Se reemplazaron temporalmente las URL centrales del perfil aislado por un host inválido para simular ausencia de red.
3. El login local funcionó y se creó el paciente con ficha provisoria y operación pendiente.
4. La aplicación se cerró y abrió nuevamente sin conexión; los datos y la ficha provisoria continuaron disponibles. El intento fallido quedó registrado como error reintentable, sin perder la operación.
5. Se restauraron las URL de staging. La sincronización automática confirmó la operación después de `2` intentos, con `last_error` vacío.
6. PocketBase central y PocketBase local coincidieron en ID, ficha provisoria y ficha definitiva; `sync_applied_operations.status` quedó `confirmed` y `sync_conflicts` permaneció en `0`.

## Rendimiento observado

El primer bootstrap reveló que las escrituras locales secuenciales no eran adecuadas para el volumen de staging. Se incorporó `forEachWithConcurrency` con concurrencia acotada a `12` y pruebas de límite, cobertura completa, fallo y parámetros inválidos. Con el ajuste, un tramo de `21983` pacientes se persistió en aproximadamente `42` segundos, cerca de ocho veces más rápido que el comportamiento secuencial observado. El bootstrap optimizado terminó con estos conteos locales:

- users: `13`
- mutuales: `127`
- pacientes: `63936`
- consultas: `207604`
- recetas: `2`

## Limpieza

Tras registrar la evidencia y cerrar la aplicación de forma ordenada, se eliminaron de staging únicamente los artefactos sintéticos creados por el piloto:

- operación aplicada `keo5606ekf49i67`
- paciente `gtqvznstug5lyd6`
- dispositivo del ensayo inicial `uonb7t19oqkduu2`
- dispositivo del ensayo optimizado `clwl9p0jydd7f9s`

La eliminación central no es reversible, pero la evidencia técnica y el perfil local aislado permanecen disponibles. Los conteos posteriores a la limpieza volvieron a `63936` pacientes, `1` dispositivo, `0` operaciones aplicadas y `0` conflictos.

La validación completa reveló además que el `finally` del test de sincronización intentaba borrar una consulta sintética antes que su evento de auditoría. Se corrigió el orden para eliminar primero `consulta_eventos`, se retiró el único residuo exacto creado por esa ejecución y se repitió el escenario. El control posterior confirmó `207604` consultas, `1` dispositivo, `0` operaciones aplicadas, `0` conflictos y `0` consultas residuales con el marcador offline de prueba.

## Verificaciones reproducibles

Desde la raíz del worktree:

```powershell
npm run test:sync-core
npx tsc --noEmit
npm run lint
npm run build
npm run test:playwright
npx openspec validate crear-version-escritorio-offline-windows --strict
npx openspec validate --all --strict
git diff --check
```

Las credenciales y secretos utilizados por el piloto se leyeron desde el archivo de entorno local y no se copiaron a este documento ni a los logs de evidencia.

## Resultado de validación final

- Núcleo de sincronización: `55` pruebas aprobadas, `0` fallidas.
- TypeScript: aprobado sin errores.
- ESLint: aprobado con `--max-warnings=0`.
- Build: aprobado con Next.js `16.3.0`.
- Playwright contra staging: `35` pruebas aprobadas, `0` fallidas, en `3.2m`.
- OpenSpec del cambio: válido en modo estricto.
- OpenSpec completo: `47` elementos aprobados, `0` fallidos.
- `git diff --check`: aprobado; sólo se informaron advertencias de normalización LF/CRLF.

Playwright se ejecutó fuera del aislamiento de red de Codex porque ese aislamiento bloquea el tráfico saliente de Chromium. La guarda `REQUIRE_TEST_POCKETBASE=true` permaneció activa y validó que la URL correspondiera a staging/test antes de iniciar la suite.
