## 1. Política de vigencia del token

- [x] 1.1 Implementar una función pura que valide `exp` y el margen preventivo del token administrativo.
- [x] 1.2 Integrar la política en `adminToken` para descartar y renovar tokens no reutilizables antes de llamar a PocketBase.

## 2. Verificación automatizada

- [x] 2.1 Agregar pruebas unitarias para tokens vigentes, próximos a vencer, vencidos y malformados.
- [x] 2.2 Verificar que el reintento ante `401` y `403` continúe funcionando una sola vez.

## 3. Validación final

- [x] 3.1 Ejecutar las pruebas focalizadas y el lint de los archivos afectados.
- [x] 3.2 Ejecutar el build de producción y validar los artefactos OpenSpec.
