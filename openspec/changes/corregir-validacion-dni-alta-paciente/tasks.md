## 1. Validacion de documento

- [x] 1.1 Simplificar la consulta de duplicados para usar `numero_documento` sin leer el esquema administrativo.
- [x] 1.2 Mantener filtros por paciente activo, tipo de documento y `exclude_id`.

## 2. Experiencia de alta

- [x] 2.1 Separar el manejo de errores de validacion del manejo de errores de creacion.
- [x] 2.2 Mostrar mensajes accionables sin indicar incorrectamente que falta la coleccion.

## 3. Verificacion y despliegue

- [x] 3.1 Agregar o actualizar pruebas enfocadas en duplicados y fallas de validacion.
- [x] 3.2 Ejecutar OpenSpec validate, pruebas relevantes y build de produccion.
- [ ] 3.3 Publicar el cambio y verificar que la ruta publica responda correctamente.
