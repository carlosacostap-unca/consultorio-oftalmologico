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

## Verificación pendiente en el equipo piloto

La publicación de `0.1.9` en el canal `pilot` y la baja final del paciente sintético permanecen pendientes. El canal `stable` no debe modificarse durante esta validación.
