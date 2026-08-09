## 1. Integración del informe clínico

- [ ] 1.1 Revisar la guía local relevante de Next.js 16 y ampliar el tipo del paciente imprimible con los campos de antecedentes ya disponibles en el registro expandido.
- [ ] 1.2 Reemplazar la resolución local basada sólo en la consulta por `mergeClinicalAntecedents(consulta, paciente)` y conservar la presentación actual de etiquetas.
- [ ] 1.3 Confirmar que la carga, los permisos, la atribución médica y el resto del contenido imprimible no cambian.

## 2. Cobertura de regresión

- [ ] 2.1 Agregar o ajustar una prueba focalizada que verifique la combinación de una consulta legacy sin Diabetes propia con un paciente que sí la tiene activa.
- [ ] 2.2 Agregar una prueba de la vista imprimible que compruebe que el informe muestra el antecedente combinado y no “Sin antecedentes activos”.
- [ ] 2.3 Verificar que un antecedente verdadero histórico de la consulta se conserva aunque no esté activo en la ficha actual.

## 3. Verificación y entrega

- [ ] 3.1 Ejecutar las pruebas focalizadas, `npm run lint` y TypeScript sin errores ni advertencias.
- [ ] 3.2 Ejecutar `npm run build` y la regresión de impresión contra testing o staging aceptado por las guardas.
- [ ] 3.3 Realizar un smoke test de sólo lectura del informe legacy y registrar que no hubo migraciones ni escrituras de datos.
- [ ] 3.4 Ejecutar `openspec validate --all --strict` y dejar el cambio listo para revisión y aplicación.
