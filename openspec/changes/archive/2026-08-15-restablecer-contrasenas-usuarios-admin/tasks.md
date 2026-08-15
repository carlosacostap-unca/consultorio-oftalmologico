## 1. API administrativa

- [x] 1.1 Crear el endpoint de restablecimiento con autorización `requireAdmin`.
- [x] 1.2 Validar usuario objetivo, longitud y confirmación antes de actualizar PocketBase.
- [x] 1.3 Devolver solo datos no sensibles y `password_configured`.

## 2. Interfaz de usuarios

- [x] 2.1 Agregar la acción `Restablecer contraseña` a cada fila, incluida la cuenta activa.
- [x] 2.2 Implementar el modal accesible con validación, estados de carga y limpieza de campos.
- [x] 2.3 Mostrar confirmación visual o error sin exponer la contraseña.

## 3. Verificación

- [x] 3.1 Agregar pruebas del flujo exitoso y del rechazo a usuarios sin rol activo admin.
- [x] 3.2 Ejecutar pruebas focalizadas, lint y build de producción.
- [x] 3.3 Validar los artefactos OpenSpec del cambio.
