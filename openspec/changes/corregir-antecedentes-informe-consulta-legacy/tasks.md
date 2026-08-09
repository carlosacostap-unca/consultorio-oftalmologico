## 1. Integración del informe clínico

- [x] 1.1 Revisar la guía local relevante de Next.js 16 y ampliar el tipo del paciente imprimible con los campos de antecedentes ya disponibles en el registro expandido.
- [x] 1.2 Reemplazar la resolución local basada sólo en la consulta por `mergeClinicalAntecedents(consulta, paciente)` y conservar la presentación actual de etiquetas.
- [x] 1.3 Confirmar que la carga, los permisos, la atribución médica y el resto del contenido imprimible no cambian.

## 2. Cobertura de regresión

- [x] 2.1 Agregar o ajustar una prueba focalizada que verifique la combinación de una consulta legacy sin Diabetes propia con un paciente que sí la tiene activa.
- [x] 2.2 Agregar una prueba de la vista imprimible que compruebe que el informe muestra el antecedente combinado y no “Sin antecedentes activos”.
- [x] 2.3 Verificar que un antecedente verdadero histórico de la consulta se conserva aunque no esté activo en la ficha actual.

## 3. Verificación y entrega

- [x] 3.1 Ejecutar las pruebas focalizadas, `npm run lint` y TypeScript sin errores ni advertencias.
- [x] 3.2 Ejecutar `npm run build` y la regresión de impresión contra testing o staging aceptado por las guardas.
  - Evidencia: Next.js 16.3.0 compiló 27 páginas estáticas y la regresión focalizada pasó 1/1 contra el PocketBase de staging aceptado por `REQUIRE_TEST_POCKETBASE=true`.
- [x] 3.3 Realizar un smoke test de sólo lectura del informe legacy y registrar que no hubo migraciones ni escrituras de datos.
  - Evidencia: el flujo imprimible cargó consulta, paciente expandido, recetas y médicos mediante lecturas; sólo la fixture aislada de staging tuvo preparación y limpieza explícitas, sin migraciones, seeds ni cambios de esquema.
- [x] 3.4 Ejecutar `openspec validate --all --strict` y dejar el cambio listo para revisión y aplicación.
  - Evidencia: la validación estricta aprobó 49/49 elementos y `git diff --check` no detectó errores.
