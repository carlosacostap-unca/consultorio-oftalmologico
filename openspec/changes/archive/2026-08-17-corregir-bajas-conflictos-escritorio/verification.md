## Evidencia del fallo

El piloto de escritorio 0.1.8 reprodujo el defecto el 16 de agosto de 2026 con el paciente sintético `PRUEBAOFFLINEPILOTO` en el equipo `PC-E24D57F3`:

- El alta offline se sincronizó correctamente y recibió la ficha central `64078`.
- La baja posterior generó un conflicto técnico con `0 campos diferentes`.
- La resolución genérica `apply_local` cerró el conflicto como actualización y el paciente volvió a aparecer activo.

La inspección del flujo confirmó que PocketBase local reemplazaba `updated`, la cola usaba ese timestamp local como revisión base y la sanitización del conflicto eliminaba la intención `sync_deleted`.

## Evidencia automatizada de la corrección

- `npm.cmd run test:sync-core`: 139 pruebas aprobadas, 0 fallidas.
- `npx.cmd --no-install tsc --noEmit`: aprobado.
- `npm.cmd run lint`: aprobado sin advertencias.
- `npm.cmd run build`: compilación de producción Next.js 16.3.0 aprobada.
- `npx.cmd --no-install openspec validate corregir-bajas-conflictos-escritorio --strict`: cambio válido.
- `git diff --check`: aprobado; sólo avisos informativos de conversión LF a CRLF.

Las pruebas agregadas cubren la selección de la revisión central, la compatibilidad con timestamps locales heredados, la detección de diferencias funcionales reales, la autorización y auditoría de la baja, la revalidación central, la presentación específica y el recorrido de regresión alta offline → confirmación → baja.

## Verificación en staging

La corrección quedó desplegada en staging desde el merge de la PR `#62`, commit `3f9ddca64ebf12bba8f0688dcf69c6b95fd18f0d`:

- La aplicación respondió correctamente en `https://staging-consultorio-oftalmologico.acostaparra.com/` con una sesión autenticada y rol Admin.
- La consola del navegador no registró advertencias ni errores durante la comprobación.
- Una consulta de sólo lectura a `/api/desktop-sync/v1/conflicts?status=open&page=1`, sin credenciales de escritorio, respondió `401` con `code: invalid_session`, confirmando que el Route Handler está activo y aplica el contrato de autenticación esperado.
- No se crearon, editaron, sincronizaron ni eliminaron registros clínicos durante esta verificación.

## Publicación del piloto corregido

La versión de escritorio `0.1.9` se publicó correctamente el 16 de agosto de 2026:

- La etiqueta anotada `desktop-v0.1.9` apunta al commit de producción `44ad34e06886cdea86d6e147580856aace1ad843` y coincide con la versión declarada en `package.json`.
- El workflow `Publicar release de escritorio` finalizó correctamente en la ejecución `31972818308`.
- Pasaron la validación de etiqueta, la auditoría de dependencias, lint, TypeScript, pruebas, el empaquetado NSIS x64 y la generación del manifiesto firmado.
- El paso `Publicar objetos inmutables y mover el puntero pilot` finalizó correctamente.
- No se ejecutó el workflow de promoción a `stable`; ese canal permaneció fuera del alcance de esta publicación.

Evidencia: https://github.com/carlosacostap-unca/consultorio-oftalmologico/actions/runs/31972818308

## Resultado de la prueba manual de `0.1.9`

La prueba sobre `PC-E24D57F3` confirmó que la baja central funcionó, pero reveló un defecto visual en el listado local:

- La operación `delete` del paciente `PRUEBAOFFLINEPILOTO` quedó confirmada sin pendientes, errores ni conflictos.
- El registro local `u2mksoh5vs4e729` conservó `sync_deleted=true` después de la confirmación y del pull central.
- El listado de pacientes continuó mostrando el registro porque su consulta sólo filtraba `estado_registro != "fusionado"` y omitía `sync_deleted != true` en escritorio.
- La corrección compone ambos filtros únicamente en el runtime de escritorio; la web conserva su contrato compatible con esquemas donde `sync_deleted` es opcional.
- La nueva prueba de regresión verifica explícitamente el filtro web y el filtro de escritorio.
- `npm.cmd run test:sync-core`: 141 pruebas aprobadas, 0 fallidas.
- `npm.cmd run lint`, `npx.cmd --no-install tsc --noEmit` y `npm.cmd run build`: aprobados.

## Publicación y verificación parcial de `0.1.10`

La versión de escritorio `0.1.10` se publicó correctamente en el canal `pilot` el 17 de agosto de 2026:

- La etiqueta `desktop-v0.1.10` apunta al commit `c4b5fcfea6a0977d3597fe882624fc5c720797b2` de `main`.
- El workflow `Publicar release de escritorio` finalizó correctamente en la ejecución `32064322616`.
- La instalación limpia, auditoría de producción, lint, TypeScript, pruebas, empaquetado NSIS x64, manifiesto firmado y publicación de objetos inmutables concluyeron correctamente.
- El paso `Publicar objetos inmutables y mover el puntero pilot` terminó correctamente.
- No se ejecutó una nueva promoción a `stable`; la última ejecución de ese workflow continúa siendo `31881058290`, del 15 de agosto de 2026.

Evidencia: https://github.com/carlosacostap-unca/consultorio-oftalmologico/actions/runs/32064322616

El equipo `PC-E24D57F3` detectó, descargó e instaló `0.1.10` mediante la actualización interna. Después del reinicio, la pantalla de sincronización mostró conexión en línea, `0` pendientes, `0` errores, `0` conflictos y la aplicación actualizada.

La comprobación visual final buscó exactamente `PRUEBAOFFLINEPILOTO` en el listado activo de pacientes de `PC-E24D57F3` y mostró `No se encontraron pacientes`. La aplicación permaneció actualizada y sincronizada. La baja central no se repitió y el piloto concluyó con `0` pendientes, `0` errores, `0` conflictos y el paciente sintético ausente de los listados activos.
