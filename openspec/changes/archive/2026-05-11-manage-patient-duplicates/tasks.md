## 1. Preparacion

- [x] 1.1 Revisar docs locales de Next.js relevantes antes de tocar App Router y route handlers.
- [x] 1.2 Revisar helpers actuales de PocketBase/admin y patrones de endpoints protegidos.
- [x] 1.3 Revisar busquedas actuales de pacientes en pacientes, turnos, consultas y recetas.

## 2. Datos y esquema

- [x] 2.1 Definir campos de fusion en `pacientes` y actualizar bootstrap/schema de testing.
- [x] 2.2 Agregar utilidades tipadas para detectar pacientes activos vs fusionados.
- [x] 2.3 Actualizar seeds de testing para poder crear casos de duplicados fusionables.

## 3. API de fusion

- [x] 3.1 Crear endpoint protegido para obtener resumen comparativo de dos pacientes.
- [x] 3.2 Crear endpoint protegido para ejecutar fusion con rol activo `admin`.
- [x] 3.3 Reasignar `turnos`, `consultas` y `recetas` desde duplicado hacia paciente principal.
- [x] 3.4 Marcar el paciente duplicado como fusionado con trazabilidad minima.
- [x] 3.5 Devolver conteos y errores operativos claros.

## 4. UI administrativa

- [x] 4.1 Agregar acceso administrativo a gestion de duplicados desde pacientes o configuracion.
- [x] 4.2 Implementar busqueda/listado de candidatos duplicados.
- [x] 4.3 Implementar comparacion lado a lado de dos pacientes.
- [x] 4.4 Implementar seleccion de paciente principal y confirmacion explicita.
- [x] 4.5 Mostrar resultado de fusion con conteos y enlace a ficha principal.

## 5. Flujos existentes

- [x] 5.1 Excluir pacientes fusionados en busquedas operativas de turnos.
- [x] 5.2 Excluir pacientes fusionados en busquedas/listados normales de pacientes.
- [x] 5.3 Mostrar estado fusionado y enlace al principal en la ficha de paciente fusionado.
- [x] 5.4 Verificar que consultas, recetas y turnos muestran el paciente principal tras fusion.

## 6. Pruebas y verificacion

- [x] 6.1 Agregar pruebas unitarias o de API para autorizacion y reasignacion de referencias.
- [x] 6.2 Agregar prueba Playwright de fusion completa contra PocketBase de testing.
- [x] 6.3 Ejecutar `npm.cmd run seed:test`.
- [x] 6.4 Ejecutar `npm.cmd run test:playwright:test`.
- [x] 6.5 Ejecutar `npm.cmd run build`.
- [x] 6.6 Ejecutar `npx.cmd openspec validate --all`.
