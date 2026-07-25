## 1. Contrato

- [x] 1.1 Documentar propuesta, diseno y especificaciones OpenSpec.

## 2. Implementacion

- [x] 2.1 Crear API admin para listar fichas con mas de un paciente activo.
- [x] 2.2 Crear pantalla admin "Fichas duplicadas" con carga, error, vacio y listado agrupado.
- [x] 2.3 Agregar la opcion "Fichas duplicadas" al menu "Calidad de datos".
- [x] 2.4 Agregar cantidad de consultas por paciente en la API y la tabla.
- [x] 2.5 Agregar accion "Queda" protegida por admin para reemplazar consultas desde `DATOMED.DBF`.
- [x] 2.6 Agregar boton "Queda" por paciente con confirmacion, estado de carga y recarga del listado.
- [x] 2.7 Compartir la logica server-side de siguiente ficha con `/api/pacientes/ficha`.
- [x] 2.8 Agregar accion "Separar" protegida por admin para asignar nueva ficha e importar copias desde `DATOMED.DBF`.
- [x] 2.9 Agregar boton "Separar" por paciente con confirmacion, estado de carga y recarga del listado.
- [x] 2.10 Paginar la pantalla de fichas duplicadas de a 5 fichas por pagina.
- [x] 2.11 Agregar navegacion desde una ficha hacia una pantalla de detalle.
- [x] 2.12 Agregar en el detalle de ficha la misma tabla y acciones que en el listado.
- [x] 2.13 Asignar medico responsable en importaciones desde DATOMED y crear nuevas consultas antes de eliminar las anteriores.
- [x] 2.14 Ampliar la busqueda de ficha nueva cuando los primeros candidatos ya estan ocupados.

## 3. Validacion

- [x] 3.1 Validar OpenSpec del cambio.
- [x] 3.2 Ejecutar build de Next.js.
- [ ] 3.3 Verificar visualmente la accion disponible en la pantalla.
