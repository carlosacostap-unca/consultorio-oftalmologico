## 1. Barrera de calidad

- [x] 1.1 Actualizar el script `lint` para ejecutar ESLint con `--max-warnings=0` sin excluir archivos adicionales.
- [x] 1.2 Registrar y comprobar el baseline inicial de 11 errores y 29 advertencias sobre `develop`.
  - Baseline comprobado con `npm run lint` sobre `develop` en `372ecd2569dca78944aa722495169b83a9f4be8d`: 11 errores y 29 advertencias.

## 2. Errores bloqueantes

- [x] 2.1 Reemplazar los `any` de consultas existentes y nuevas por tipos de dominio o `unknown` validado.
- [x] 2.2 Reemplazar los `any` de recetas existentes y nuevas por tipos explícitos compatibles con PocketBase.
- [x] 2.3 Corregir el `any` de la pantalla de seed sin debilitar el manejo de errores.
- [x] 2.4 Renombrar la variable reservada `module` en la prueba de recordatorios y conservar su intención.
- [x] 2.5 Ejecutar ESLint y TypeScript sobre los archivos corregidos y confirmar que desaparecen los 11 errores.
  - ESLint focalizado: 0 errores; TypeScript: correcto. Las 11 advertencias restantes de estos archivos pertenecen a los lotes de hooks y variables sin uso.

## 3. Dependencias de hooks

- [x] 3.1 Corregir y verificar los hooks de bloqueos de agenda, horarios médicos y listado de consultas.
- [x] 3.2 Corregir y verificar los hooks de consulta existente y alta de consulta sin ciclos ni estado obsoleto.
- [x] 3.3 Corregir y verificar los hooks de recetas existentes y nuevas.
- [x] 3.4 Corregir y verificar los hooks de impresión, alta y listado de turnos, incluidos los controles de duplicados.
- [x] 3.5 Ejecutar pruebas focalizadas o validaciones manuales de los flujos modificados.
  - Aprobaron 44 pruebas unitarias/focalizadas y dos escenarios Playwright: circuito consulta-receta-impresiones y bloqueos con turnos afectados.

## 4. Advertencias restantes

- [x] 4.1 Eliminar variables y parámetros sin uso en pantallas clínicas y administrativas sin quitar llamadas con efectos laterales.
- [x] 4.2 Eliminar variables sin uso en sincronización, migraciones, scripts y pruebas.
- [x] 4.3 Migrar la imagen señalada a `next/image` preservando su presentación y compatibilidad standalone.

## 5. Verificación final

- [x] 5.1 Ejecutar `npm run lint` y confirmar cero errores y cero advertencias.
- [x] 5.2 Ejecutar TypeScript y las pruebas focalizadas de consultas, turnos, recetas, recordatorios y escritorio.
  - TypeScript correcto; 44 pruebas locales y 2 E2E aprobadas. Los E2E requirieron compatibilidad temporal del guard de staging y un selector `FO` exacto; ambos ajustes auxiliares se retiraron por pertenecer a otro cambio.
- [x] 5.3 Ejecutar el build de producción de Next.js y comprobar la salida standalone.
  - Build de Next.js `16.3.0` correcto y `.next/standalone/server.js` generado.
- [x] 5.4 Validar ambos cambios OpenSpec en modo estricto y documentar los resultados finales.
  - `sanear-baseline-lint` válido en modo estricto; validación global: 47 elementos correctos y 0 fallos. La actualización de dependencias ya archivada permanece representada por `production-dependency-security`, también válida.
