## 1. Recuperación de autenticación administrativa

- [x] 1.1 Actualizar `pbAdmin` para renovar el token y reintentar una vez ante respuestas `401`.
- [x] 1.2 Mantener compatibilidad con endpoints de autenticación `_superusers` y `/api/admins` sin cambiar `requireAdmin`.

## 2. Verificación

- [x] 2.1 Agregar una prueba automatizada para un token expirado seguido de una renovación exitosa.
- [x] 2.2 Ejecutar la prueba focalizada, lint de los archivos afectados y build de producción.
- [x] 2.3 Validar los artefactos OpenSpec del cambio.
