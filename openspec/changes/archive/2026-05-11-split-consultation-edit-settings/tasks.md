## 1. Spec

- [x] 1.1 Documentar la separacion de Edicion de consultas en OpenSpec.

## 2. UI

- [x] 2.1 Crear la pagina `/edicion-consultas` con la seccion de configuracion de consultas.
- [x] 2.2 Proteger `/edicion-consultas` con sesion valida y rol activo `admin`.
- [x] 2.3 Quitar la seccion de configuracion de consultas de `/permisos`.
- [x] 2.4 Dejar `/permisos` solamente con permisos de Medico y Secretaria.
- [x] 2.5 Agregar `Edicion de consultas` al menu Configuracion.

## 3. Verification

- [x] 3.1 Ejecutar `npm.cmd run openspec:validate`.
- [x] 3.2 Ejecutar `npm.cmd run build`.
- [x] 3.3 Ejecutar lint enfocado en los archivos tocados.
