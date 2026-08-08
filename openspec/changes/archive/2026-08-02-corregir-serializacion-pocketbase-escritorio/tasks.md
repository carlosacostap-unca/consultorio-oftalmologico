## 1. Transporte PocketBase

- [x] 1.1 Extraer la preparación de solicitudes de escritorio a una función pura que preserve las restricciones de escritura existentes.
- [x] 1.2 Devolver las cabeceras de la solicitud como un objeto plano enumerable, conservando `Content-Type`, dispositivo y actor.
- [x] 1.3 Permitir altas y actualizaciones directas de `mutuales` sólo durante la copia inicial identificada con origen central.
- [x] 1.4 Incorporar un IPC local confinado que compruebe la existencia de un usuario por ID mediante el superusuario técnico sin exponer credenciales.
- [x] 1.5 Incorporar un IPC local confinado que cree o actualice únicamente registros validados de `system_settings` mediante el superusuario técnico.

## 2. Pruebas de regresión

- [x] 2.1 Probar que autenticaciones y escrituras con cuerpos de objeto se serializan como JSON válido en el SDK de PocketBase.
- [x] 2.2 Probar que se conservan las cabeceras de escritorio y que continúan bloqueadas las colecciones fuera del alcance offline.
- [x] 2.3 Generar credenciales aleatorias para usuarios adicionales dentro del límite de 72 bytes de bcrypt y probar longitud, formato y variación.
- [x] 2.4 Probar que la excepción de bootstrap admite sólo `mutuales`, los métodos y la cabecera previstos y mantiene bloqueadas las demás escrituras administrativas.
- [x] 2.5 Probar la validación estricta de IDs del IPC y que el bootstrap evita recrear usuarios adicionales ya existentes.
- [x] 2.6 Probar la validación del payload de configuración y que el bootstrap delega únicamente `system_settings` al IPC privilegiado.

## 3. Verificación de escritorio

- [x] 3.1 Ejecutar pruebas focalizadas, ESLint, TypeScript y el build de Next.js.
- [x] 3.2 Regenerar una aplicación portátil separada desde la salida standalone vigente.
- [x] 3.3 Verificar que el servidor incluido en el paquete contiene la generación de credenciales de 64 bytes y no la expresión anterior de 73 bytes; después comprobar el inicio de PocketBase y Next.js.
- [x] 3.4 Repetir pruebas, análisis estático y build; generar un paquete `v4` y verificar que contiene la excepción acotada vigente.
- [x] 3.5 Ejecutar el intento con `v4` y diagnosticar el conflicto de email causado por usuarios existentes no visibles para la sesión local.
- [x] 3.6 Repetir pruebas, análisis estático y build; generar un paquete `v5` que contenga el IPC y la lógica idempotente vigentes.
- [x] 3.7 Ejecutar el intento con `v5` y diagnosticar el rechazo de `system_settings` reservado a superusuarios.
- [x] 3.8 Repetir pruebas, análisis estático y build; generar un paquete `v6` que contenga el upsert privilegiado confinado.
- [x] 3.9 Repetir manualmente la activación contra staging conservando el dispositivo y la base local existentes.
