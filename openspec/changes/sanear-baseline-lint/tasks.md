## 1. Barrera de calidad

- [ ] 1.1 Actualizar el script `lint` para ejecutar ESLint con `--max-warnings=0` sin excluir archivos adicionales.
- [ ] 1.2 Registrar y comprobar el baseline inicial de 11 errores y 29 advertencias sobre `develop`.

## 2. Errores bloqueantes

- [ ] 2.1 Reemplazar los `any` de consultas existentes y nuevas por tipos de dominio o `unknown` validado.
- [ ] 2.2 Reemplazar los `any` de recetas existentes y nuevas por tipos explícitos compatibles con PocketBase.
- [ ] 2.3 Corregir el `any` de la pantalla de seed sin debilitar el manejo de errores.
- [ ] 2.4 Renombrar la variable reservada `module` en la prueba de recordatorios y conservar su intención.
- [ ] 2.5 Ejecutar ESLint y TypeScript sobre los archivos corregidos y confirmar que desaparecen los 11 errores.

## 3. Dependencias de hooks

- [ ] 3.1 Corregir y verificar los hooks de bloqueos de agenda, horarios médicos y listado de consultas.
- [ ] 3.2 Corregir y verificar los hooks de consulta existente y alta de consulta sin ciclos ni estado obsoleto.
- [ ] 3.3 Corregir y verificar los hooks de recetas existentes y nuevas.
- [ ] 3.4 Corregir y verificar los hooks de impresión, alta y listado de turnos, incluidos los controles de duplicados.
- [ ] 3.5 Ejecutar pruebas focalizadas o validaciones manuales de los flujos modificados.

## 4. Advertencias restantes

- [ ] 4.1 Eliminar variables y parámetros sin uso en pantallas clínicas y administrativas sin quitar llamadas con efectos laterales.
- [ ] 4.2 Eliminar variables sin uso en sincronización, migraciones, scripts y pruebas.
- [ ] 4.3 Migrar la imagen señalada a `next/image` preservando su presentación y compatibilidad standalone.

## 5. Verificación final

- [ ] 5.1 Ejecutar `npm run lint` y confirmar cero errores y cero advertencias.
- [ ] 5.2 Ejecutar TypeScript y las pruebas focalizadas de consultas, turnos, recetas, recordatorios y escritorio.
- [ ] 5.3 Ejecutar el build de producción de Next.js y comprobar la salida standalone.
- [ ] 5.4 Validar ambos cambios OpenSpec en modo estricto y documentar los resultados finales.
