# Piloto de escritorio 0.1.9: bajas sin conflicto técnico

Este procedimiento valida la actualización automática `0.1.8` → `0.1.9` y la corrección de bajas de pacientes recién sincronizados únicamente en el canal `pilot`.

No promover `0.1.9` a `stable` dentro de esta prueba.

## Alcance y seguridad

- Equipo: `PC-E24D57F3`.
- Plataforma: Windows 11 x64.
- Canal: `pilot`.
- Paciente sintético exclusivo: documento `PRUEBAOFFLINEPILOTO`, ficha central `64078`.
- No crear otro paciente ni eliminar un registro diferente.
- No copiar tokens, secretos ni contenido clínico real a la evidencia.

## 1. Comprobaciones previas

- [ ] La aplicación instalada informa versión `0.1.8`.
- [ ] El equipo está en línea y asignado a `pilot`.
- [ ] El paciente `PRUEBAOFFLINEPILOTO` no tiene consultas ni recetas asociadas.
- [ ] El canal `stable` conserva su versión actual.
- [ ] Se exportó un diagnóstico previo sanitizado.

## 2. Publicación sólo en pilot

- [ ] El commit de `0.1.9` está integrado en `main`.
- [ ] La etiqueta `desktop-v0.1.9` apunta exactamente a ese commit de `main`.
- [ ] `desktop-release.yml` terminó correctamente.
- [ ] El paso `Publicar objetos inmutables y mover el puntero pilot` terminó correctamente.
- [ ] No se ejecutó `desktop-promote-stable.yml`.

Registrar tag, commit, ejecución de GitHub Actions, nombre, tamaño y digest del artefacto.

## 3. Actualización in-place

1. Abrir la aplicación `0.1.8` con conexión.
2. Presionar `Buscar actualizaciones`.
3. Confirmar que detecta y descarga `0.1.9`.
4. Presionar `Reiniciar y actualizar` cuando la descarga esté lista.
5. Confirmar que la aplicación reabre sin reinstalación manual.
6. Confirmar que conserva la sesión, la identidad `PC-E24D57F3` y los datos locales.

- [ ] La aplicación informa versión `0.1.9`.
- [ ] La identidad del equipo se conserva.
- [ ] El estado inicial queda en `0` pendientes, `0` errores y `0` conflictos.

## 4. Baja exclusiva y sincronización

1. Buscar el paciente por documento exacto `PRUEBAOFFLINEPILOTO`.
2. Verificar que corresponde a `PILOTO, UPDATE 018` y ficha `64078`.
3. Eliminar exclusivamente ese paciente desde la aplicación de escritorio.
4. Confirmar que desaparece del listado activo local.
5. Sincronizar y esperar la finalización.
6. Volver a buscar el documento en escritorio y en la vista central activa de staging.

- [ ] La baja se sincroniza sin conflicto técnico.
- [ ] Quedan `0` pendientes, `0` errores y `0` conflictos.
- [ ] El paciente no aparece en el listado activo de escritorio.
- [ ] El paciente no aparece en el listado central activo de staging.
- [ ] La baja lógica conserva su auditoría central.

## 5. Cierre

- [ ] Se exportó un diagnóstico posterior sanitizado.
- [ ] Se registraron hora, versión, equipo, canal y conteos finales.
- [ ] El resultado del piloto quedó documentado como aprobado o rechazado.
- [ ] `stable` permaneció sin cambios.

Ante cualquier discrepancia, no promover la versión. Conservar `stable`, exportar el diagnóstico y corregir mediante una versión superior.
