## 1. Baseline y destino del release

- [x] 1.1 Actualizar `origin/main` y `origin/develop` y registrar SHA, ancestro común, commits exclusivos y simulación de conflictos.
  - Evidencia: `main=9d30848`, `develop=38f3627`, ancestro `65c942c`, divergencia `5/28`; conflicto simulado en `app/consultas/[id]/page.tsx` entre `any[]` y `Receta[]`.
- [ ] 1.2 Identificar proveedor, proyecto, rama y SHA efectivos de producción y staging sin asumir que GitHub registra los deployments.
- [x] 1.3 Inventariar los cambios exclusivos de ambas ramas y documentar qué comportamiento debe preservar el resultado, incluido el médico responsable en impresiones.
  - Evidencia: `main` modifica 20 rutas y `develop` 135 desde el ancestro; 12 rutas cambian en ambos lados. Se debe preservar `fbd817b` (médico responsable), las correcciones equivalentes de antecedentes y los controles Next.js/lint de `develop`.

## 2. Reconciliación de ramas

- [ ] 2.1 Fusionar `origin/main` en la rama de release nacida del `origin/develop` verificado, sin rebase ni force push.
- [ ] 2.2 Resolver el conflicto de consultas conservando `Receta[]`, los tipos explícitos y el lint estricto.
- [ ] 2.3 Revisar el resultado semántico de impresiones, atribución médica y antecedentes aunque Git no marque conflicto textual.
- [ ] 2.4 Confirmar que el diff no incorpora actualizaciones de dependencias, migraciones, seeds ni importaciones fuera del alcance.

## 3. Barrera para la versión de escritorio incompleta

- [ ] 3.1 Inventariar componentes, navegación y detección de runtime que separan la experiencia web de la experiencia de escritorio.
- [ ] 3.2 Auditar autenticación, autorización por usuario/equipo e idempotencia de las rutas `/api/desktop-sync/v1/*` incluidas en el build web.
- [ ] 3.3 Agregar o ejecutar pruebas focalizadas que demuestren el aislamiento de la interfaz web y el rechazo de solicitudes de sincronización no autorizadas.
- [ ] 3.4 Corregir o desactivar explícitamente cualquier exposición insegura; bloquear el release si no puede demostrarse aislamiento suficiente.

## 4. Verificación reproducible

- [ ] 4.1 Ejecutar `npm ci`, `npm audit --omit=dev` y la auditoría completa desde el worktree de release.
- [ ] 4.2 Ejecutar `npm run lint` y TypeScript y confirmar cero errores y cero advertencias.
- [ ] 4.3 Ejecutar las pruebas locales y de integración relevantes para web, PocketBase y sincronización de escritorio.
- [ ] 4.4 Ejecutar `npm run build`, comprobar la salida standalone y verificar que no incorpora URLs de staging.
- [ ] 4.5 Ejecutar contra testing o staging los circuitos E2E de autenticación, turnos, consultas, recetas, antecedentes, alta por DNI e impresiones con médico responsable.

## 5. Pull request y publicación

- [ ] 5.1 Publicar la rama, crear un PR hacia `main` y verificar base, cabeza, mergeabilidad, diff y checks remotos.
- [ ] 5.2 Presentar el destino, los SHA, las verificaciones y el plan de rollback, y obtener aprobación explícita antes de fusionar.
- [ ] 5.3 Fusionar el PR aprobado, esperar el despliegue y comprobar que el SHA efectivo coincide con el release esperado.
- [ ] 5.4 Ejecutar smoke tests no destructivos en producción sobre acceso, turnos, consultas, recetas, antecedentes, DNI e impresiones.
- [ ] 5.5 Si falla una verificación bloqueante, revertir el merge con un commit trazable y confirmar el retorno al SHA estable previo.

## 6. Cierre documental

- [ ] 6.1 Registrar en estas tareas los comandos, resultados, SHA y evidencias finales del release o de cualquier bloqueo.
- [ ] 6.2 Ejecutar `openspec validate --all --strict` y dejar el cambio listo para sincronizar y archivar después del release exitoso.
