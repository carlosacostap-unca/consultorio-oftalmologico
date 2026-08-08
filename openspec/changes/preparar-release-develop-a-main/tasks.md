## 1. Baseline y destino del release

- [x] 1.1 Actualizar `origin/main` y `origin/develop` y registrar SHA, ancestro común, commits exclusivos y simulación de conflictos.
  - Evidencia: `main=9d30848`, `develop=38f3627`, ancestro `65c942c`, divergencia `5/28`; conflicto simulado en `app/consultas/[id]/page.tsx` entre `any[]` y `Receta[]`.
- [ ] 1.2 Identificar proveedor, proyecto, rama y SHA efectivos de producción y staging sin asumir que GitHub registra los deployments.
  - Pendiente: GitHub no registra deployments, el worktree no contiene `.vercel`, la sesión del navegador no está disponible en esta tarea y la consulta de sólo lectura por Vercel CLI agotó el tiempo; requiere acceso autenticado al proveedor.
- [x] 1.3 Inventariar los cambios exclusivos de ambas ramas y documentar qué comportamiento debe preservar el resultado, incluido el médico responsable en impresiones.
  - Evidencia: `main` modifica 20 rutas y `develop` 135 desde el ancestro; 12 rutas cambian en ambos lados. Se debe preservar `fbd817b` (médico responsable), las correcciones equivalentes de antecedentes y los controles Next.js/lint de `develop`.

## 2. Reconciliación de ramas

- [x] 2.1 Fusionar `origin/main` en la rama de release nacida del `origin/develop` verificado, sin rebase ni force push.
  - Evidencia: merge commit local `e664ab0`, con padres `05cf9ea` y `9d30848`; no se reescribió ninguna rama remota.
- [x] 2.2 Resolver el conflicto de consultas conservando `Receta[]`, los tipos explícitos y el lint estricto.
  - Evidencia: único conflicto textual resuelto con `useRef<Map<string, Receta[]>>`; no quedan marcadores de conflicto.
- [x] 2.3 Revisar el resultado semántico de impresiones, atribución médica y antecedentes aunque Git no marque conflicto textual.
  - Evidencia: se preservan `doctorLabelFromList`, `loadAuthenticatedDoctors`, sus pruebas y los tres documentos imprimibles; las correcciones de antecedentes eran equivalentes y no generan una reversión.
- [x] 2.4 Confirmar que el diff no incorpora actualizaciones de dependencias, migraciones, seeds ni importaciones fuera del alcance.
  - Evidencia: el merge agrega sólo las 12 rutas de la corrección exclusiva de atribución médica; no modifica `package.json`, lockfile, migraciones, seeds ni importadores.

## 3. Barrera para la versión de escritorio incompleta

- [x] 3.1 Inventariar componentes, navegación y detección de runtime que separan la experiencia web de la experiencia de escritorio.
  - Evidencia: `DesktopSyncProvider`, `DesktopSyncIndicator`, `Sidebar`, la portada y `/sincronizacion` condicionan la experiencia al bridge `window.consultorioDesktop`; el acceso web directo sólo muestra una explicación y no invoca el bridge local.
- [x] 3.2 Auditar autenticación, autorización por usuario/equipo e idempotencia de las rutas `/api/desktop-sync/v1/*` incluidas en el build web.
  - Evidencia: escaneo Codex Security `9beb58cc-8192-4ff2-8b15-c6eccb214078` sobre las rutas de sincronización, con cobertura completa; detectó una exposición alta y dos medias, todas condicionadas a `DESKTOP_SYNC_ENABLED=true`.
- [x] 3.3 Agregar o ejecutar pruebas focalizadas que demuestren el aislamiento de la interfaz web y el rechazo de solicitudes de sincronización no autorizadas.
  - Evidencia: 7/7 pruebas de política, 37/37 de `test:sync-core`, 1/1 Playwright focalizada de sincronización y 33/33 del conjunto E2E completo contra staging.
- [x] 3.4 Corregir o desactivar explícitamente cualquier exposición insegura; bloquear el release si no puede demostrarse aislamiento suficiente.
  - Evidencia: alta inicial de equipo limitada a administradores, operaciones protegidas por permisos configurados y titularidad central, conflictos acotados por equipo y actor, y API deshabilitada salvo habilitación explícita.

## 4. Verificación reproducible

- [x] 4.1 Ejecutar `npm ci`, `npm audit --omit=dev` y la auditoría completa desde el worktree de release.
  - Evidencia: instalación limpia de 664 paquetes; `npm ls --depth=0` coherente y auditoría completa de 665 paquetes con 0 vulnerabilidades.
- [x] 4.2 Ejecutar `npm run lint` y TypeScript y confirmar cero errores y cero advertencias.
  - Evidencia: ESLint con `--max-warnings=0` y `tsc --noEmit` finalizaron correctamente.
- [x] 4.3 Ejecutar las pruebas locales y de integración relevantes para web, PocketBase y sincronización de escritorio.
  - Evidencia: 37/37 pruebas del núcleo de sincronización y las pruebas focalizadas de autorización e integración finalizaron correctamente.
- [x] 4.4 Ejecutar `npm run build`, comprobar la salida standalone y verificar que no incorpora URLs de staging.
  - Evidencia: build de Next.js 16.3.0 correcto, 27 páginas estáticas y ninguna URL de staging encontrada en `.next/standalone`.
- [x] 4.5 Ejecutar contra testing o staging los circuitos E2E de autenticación, turnos, consultas, recetas, antecedentes, alta por DNI e impresiones con médico responsable.
  - Evidencia: conjunto Playwright completo contra staging, 33/33 pruebas aprobadas en 2,7 minutos.

## 5. Pull request y publicación

- [x] 5.1 Publicar la rama, crear un PR hacia `main` y verificar base, cabeza, mergeabilidad, diff y checks remotos.
  - Evidencia: PR draft `#14`, base `main@9d30848`, cabeza `codex/preparar-release-develop-a-main@1b3ddc4`, 133 archivos, estado `MERGEABLE/CLEAN`; GitHub no reporta checks configurados para la rama.
- [ ] 5.2 Presentar el destino, los SHA, las verificaciones y el plan de rollback, y obtener aprobación explícita antes de fusionar.
- [ ] 5.3 Fusionar el PR aprobado, esperar el despliegue y comprobar que el SHA efectivo coincide con el release esperado.
- [ ] 5.4 Ejecutar smoke tests no destructivos en producción sobre acceso, turnos, consultas, recetas, antecedentes, DNI e impresiones.
- [ ] 5.5 Si falla una verificación bloqueante, revertir el merge con un commit trazable y confirmar el retorno al SHA estable previo.

## 6. Cierre documental

- [ ] 6.1 Registrar en estas tareas los comandos, resultados, SHA y evidencias finales del release o de cualquier bloqueo.
  - Evidencia parcial: se registraron baseline, merge, auditoría de seguridad, verificaciones locales, E2E, PR y el bloqueo de acceso autenticado al proveedor; falta completar despliegue o rollback.
- [ ] 6.2 Ejecutar `openspec validate --all --strict` y dejar el cambio listo para sincronizar y archivar después del release exitoso.
  - Evidencia parcial: `openspec validate --all --strict` aprobó 48/48 elementos; la sincronización y el archivado esperan el release exitoso.
