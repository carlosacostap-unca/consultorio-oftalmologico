## 1. Navegacion lateral

- [x] 1.1 Leer la guia local de Next.js pertinente antes de editar componentes App Router.
- [x] 1.2 Reestructurar `components/Sidebar.tsx` para definir secciones de menu por rol activo.
- [x] 1.3 Asegurar que Secretaria vea Turnos, Bloqueos y feriados, Pacientes, Mutuales, Consultas y Recetas.
- [x] 1.4 Asegurar que Medico vea Mi jornada, Consultas, Recetas, Pacientes y Mis bloqueos, sin Mutuales ni administracion.
- [x] 1.5 Asegurar que Admin vea Configuracion, Datos y Calidad de datos.
- [x] 1.6 Verificar que el cambio de rol activo actualice el menu sin recargar.

## 2. Panel inicial

- [x] 2.1 Reemplazar el panel autenticado generico de `app/page.tsx` por contenido declarativo por rol activo.
- [x] 2.2 Crear accesos principales de Secretaria: Turnos, Nuevo turno, Pacientes y Mutuales.
- [x] 2.3 Crear accesos principales de Medico: Mi jornada, Consultas, Pacientes y Recetas.
- [x] 2.4 Crear accesos principales de Admin: Usuarios, Permisos, Horarios medicos y Duplicados.
- [x] 2.5 Mantener avatar, nombre, email, rol activo y cierre de sesion.

## 3. Verificacion

- [x] 3.1 Ejecutar `npm run build`.
- [x] 3.2 Revisar con busqueda estatica que los labels esperados por rol existan y no haya enlaces administrativos en menu medico.
- [x] 3.3 Actualizar esta lista marcando las tareas completadas.
