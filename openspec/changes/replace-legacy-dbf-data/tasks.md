## 1. Diagnostico DBF

- [x] 1.1 Crear utilidades compartidas para leer DBF con CP850, fechas DBF y campos numericos/textuales.
- [x] 1.2 Implementar diagnostico `dry-run` para `MUTUALES.DBF`, `PACIENTE.DBF` y `DATOMED.DBF` sin escritura en PocketBase.
- [x] 1.3 Clasificar fichas duplicadas en consolidables y ambiguas usando identidad normalizada.
- [x] 1.4 Detectar consultas huerfanas y consultas afectadas por fichas ambiguas.
- [x] 1.5 Detectar codigos de mutual ausentes, vacios o duplicados.
- [x] 1.6 Detectar pacientes con `DIAGNO` y `PRESUNTIVO` para consulta historica.

## 2. Reportes Y Reglas

- [x] 2.1 Generar reporte resumen con conteos de origen, importables y excepciones.
- [x] 2.2 Generar reporte de fichas duplicadas con ejemplos y cantidad de consultas asociadas.
- [x] 2.3 Generar reporte de consultas huerfanas con ficha, cantidad, primera fecha y ultima fecha.
- [x] 2.4 Generar reporte de mutuales/codigos legacy no identificados.
- [x] 2.5 Documentar en la salida del diagnostico que no se aplicaron cambios y que `--apply` requiere confirmacion posterior.

## 3. Importador Controlado

- [x] 3.1 Implementar autenticacion administrativa reutilizando `.env.local` o el archivo de entorno indicado por argumento.
- [x] 3.2 Agregar guardas para bloquear aplicacion destructiva sin flag explicito.
- [x] 3.3 Implementar backup/exportacion previa de `mutuales`, `pacientes`, `consultas` y dependencias relacionadas antes del reemplazo.
- [x] 3.4 Implementar carga de mutuales por `COD_MUT`, incluyendo mutuales administrativas configuradas para legacy incompleto.
- [x] 3.5 Implementar carga de pacientes consolidados, antecedentes, ocupacion, cobertura textual y `mutual_id` cuando sea confiable.
- [x] 3.6 Implementar carga de consultas de `DATOMED.DBF` con asignacion de paciente solo para fichas seguras.
- [x] 3.7 Implementar preservacion de `PACIENTE.DBF.DIAGNO` como consulta historica reconocible.
- [x] 3.8 Reportar importaciones omitidas o huerfanas sin abortar todo el proceso cuando sean excepciones esperadas.

## 4. Validacion

- [x] 4.1 Ejecutar diagnostico contra los DBF actuales y revisar los reportes generados.
- [x] 4.2 Probar importacion completa en PocketBase de testing o copia aislada antes de produccion.
- [x] 4.3 Verificar conteos finales de mutuales, pacientes y consultas contra el diagnostico.
- [x] 4.4 Revisar muestras manuales en `/pacientes`, `/consultas` y `/mutuales` para pacientes con mutual normal, mutual legacy, ficha duplicada consolidada y consulta historica.
- [x] 4.5 Ejecutar `npm.cmd run build`.
- [x] 4.6 Ejecutar pruebas Playwright relevantes si el entorno de testing queda disponible.
