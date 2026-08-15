# Evidencia del piloto de paginación y actualización 0.1.7

Fecha: 2026-08-15

Cambio OpenSpec: `corregir-paginacion-sincronizacion-escritorio`

Equipo piloto: `PC-E24D57F3`

Canal evaluado: `pilot`

Canal `stable`: sin modificaciones

## Resultado

El contrato compatible se desplegó en staging y el equipo piloto completó la descarga reanudable desde su cursor durable. La aplicación quedó en línea y sincronizada, con `0` operaciones pendientes, `0` errores y `0` conflictos. El último intento registrado fue el `2026-08-15 07:29:13` y el último éxito el `2026-08-15 07:29:14`.

La aplicación de escritorio instalada en la versión `0.1.6` detectó la versión `0.1.7`, la descargó dentro de la aplicación, ofreció la acción `Reiniciar y actualizar` y volvió a abrirse actualizada sin desinstalar ni ejecutar manualmente otro instalador. Después del reinicio conservó la sesión operativa, la identidad del equipo y el estado de sincronización.

## Publicación verificada

- Tag: `desktop-v0.1.7`.
- Commit publicado en `main`: `3f91794c079ba424fd9c0f38febab101a1062031`.
- Ejecución de GitHub Actions: `31878331630`, completada correctamente.
- Artefacto de CI: `desktop-v0.1.7-signed`.
- Tamaño del artefacto: `179250792` bytes.
- Digest del artefacto: `sha256:37d8331e51cfce51d860d1758b270026202e1c23c6016022d28bb08db01fcbf9`.
- El puntero del canal `pilot` se actualizó a `0.1.7`; el puntero `stable` no se modificó.

## Comprobaciones manuales

1. La versión `0.1.6` encontró y descargó la actualización `0.1.7`.
2. La interfaz informó `Actualización 0.1.7 lista`.
3. `Reiniciar y actualizar` cerró, instaló y abrió nuevamente la aplicación.
4. El equipo `PC-E24D57F3` quedó `En línea` y `Sincronizado`.
5. La pantalla informó `0` pendientes, `0` errores y `0` conflictos.
6. No quedaron operaciones pendientes ni conflictos abiertos.
7. La aplicación informó que estaba actualizada.

Las comprobaciones se documentaron a partir de las capturas suministradas por el usuario. No se copiaron credenciales, tokens ni contenido clínico a esta evidencia.
