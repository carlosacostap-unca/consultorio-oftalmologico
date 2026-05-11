# PRD - Sistema de Gestion para Consultorio Oftalmologico

## 1. Resumen

El sistema es una aplicacion web para la gestion integral de un consultorio oftalmologico. Centraliza pacientes, mutuales, turnos, disponibilidades, consultas clinicas, recetas, usuarios, permisos y procesos de importacion de datos historicos.

El producto esta orientado a reducir friccion operativa diaria, preservar la trazabilidad clinica del paciente y permitir que medico, secretaria y administradores trabajen sobre una unica fuente de informacion.

## 2. Objetivos

- Centralizar la ficha administrativa y clinica de cada paciente.
- Agilizar el alta de pacientes, la busqueda por padron y la relacion con obra social o mutual.
- Gestionar agenda, disponibilidades, turnos regulares y sobreturnos.
- Registrar consultas oftalmologicas completas, con historial navegable por paciente.
- Emitir y consultar recetas vinculadas opcionalmente a consultas.
- Controlar roles, permisos y configuraciones sensibles desde una administracion interna.
- Migrar informacion historica desde fuentes legacy hacia PocketBase.
- Mantener el comportamiento funcional documentado en OpenSpec para guiar cambios futuros.

## 3. Usuarios

### Administrador

Responsable de usuarios, roles, permisos y configuraciones generales del sistema. Debe poder crear usuarios, cambiar roles, administrar permisos para medico y secretaria, y configurar limites operativos como la ventana de edicion de consultas.

### Medico

Responsable de la atencion clinica. Debe poder consultar pacientes, revisar historial, crear y editar consultas dentro de los limites configurados, emitir recetas y acceder a informacion oftalmologica completa.

### Secretaria

Responsable de la operacion diaria de agenda y pacientes. Debe poder gestionar pacientes, turnos, disponibilidades, mutuales y datos administrativos segun los permisos asignados.

## 4. Alcance Funcional

### 4.1 Acceso y navegacion

El sistema debe permitir acceso autenticado mediante Google OAuth2 usando la coleccion `users` de PocketBase. Las pantallas operativas deben redirigir a `/` cuando no exista una sesion valida.

La navegacion principal debe estar disponible solo para usuarios autenticados e incluir accesos a Pacientes, Mutuales, Turnos, Disponibilidades, Consultas y Recetas. El acceso a Permisos debe mostrarse solo para administradores.

### 4.2 Gestion de pacientes

El sistema debe permitir listar, buscar, crear, ver, editar y eliminar pacientes. La busqueda debe contemplar nombre, apellido, documento y numero de ficha, con soporte de filtro alfabetico y paginacion.

Durante el alta de paciente, el sistema debe calcular el siguiente numero de ficha disponible y evitar fichas duplicadas. Si la mutual buscada no existe, el usuario debe poder crearla rapidamente desde el mismo flujo de alta.

El detalle de paciente debe mostrar datos personales, contacto, cobertura e historial clinico. Desde la ficha del paciente debe ser posible iniciar una nueva consulta.

### 4.3 Gestion de mutuales

El sistema debe permitir listar mutuales ordenadas por nombre, buscar por nombre o codigo, crear, editar, ver y eliminar registros. El listado debe mostrar la cantidad de pacientes asociados a cada mutual.

Antes de eliminar una mutual con pacientes relacionados, el sistema debe advertir la cantidad de relaciones existentes.

### 4.4 Agenda, disponibilidades y turnos

El sistema debe administrar disponibilidades de agenda con fecha, hora de inicio, hora de fin y tipo. Los turnos deben poder visualizarse en vistas de lista, diaria y semanal, con filtros por paciente y fecha.

El usuario debe poder crear turnos regulares vinculados a paciente y disponibilidad, validando que el horario se encuentre dentro del rango disponible. Tambien debe poder crear o editar datos minimos del paciente durante la carga del turno.

El sistema debe permitir cambios rapidos de estado, motivo y observaciones desde el listado. Debe soportar sobreturnos, permitiendo indicar tipo de sobreturno y mostrar contexto de turnos adyacentes del mismo dia.

Debe existir una vista imprimible de turnos diarios con columnas seleccionables.

### 4.5 Consultas clinicas

El sistema debe permitir listar consultas con filtros por paciente, inicial y fecha. Las consultas deben asociarse a un paciente y opcionalmente a un turno.

Al crear una consulta desde paciente, debe precargarse la informacion disponible del paciente, mutual y antecedentes. Al crear una consulta desde turno, debe precargarse paciente y motivo. Al guardar una consulta creada desde turno, el turno debe quedar vinculado y pasar a estado `Atendido`.

La consulta debe registrar datos oftalmologicos: motivo, antecedentes, agudeza visual, presion intraocular, refraccion de lejos y cerca, ADD, biomicroscopia, fondo de ojo, diagnostico y tratamiento.

El sistema debe calcular refraccion de cerca a partir de ADD cuando corresponda. Tambien debe permitir navegar entre consultas del mismo paciente y consultar recetas asociadas.

La edicion de consultas debe respetar el limite configurado en `consulta_edit_limit_days`. Fuera de ese periodo, la interfaz debe quedar en modo lectura y el API debe rechazar modificaciones.

Debe existir una impresion de receta de anteojos basada en los datos de refraccion de una consulta.

### 4.6 Recetas

El sistema debe permitir listar recetas con paciente y consulta expandida, filtrar por paciente y fecha, crear recetas libres o desde una consulta, ver, editar y eliminar recetas.

Una receta debe registrar paciente, fecha, medicamentos o anteojos e indicaciones. Cuando exista una consulta relacionada, debe ofrecer acceso a la impresion de anteojos de esa consulta.

### 4.7 Administracion y configuracion

El sistema debe reconocer roles `admin`, `medico` y `secretaria`. El rol `admin` debe conservar acceso administrativo, mientras que `medico` y `secretaria` deben ser roles administrables desde la matriz de permisos.

Los administradores deben poder:

- Crear usuarios verificados para uso con Google OAuth.
- Cambiar roles de usuarios.
- Consultar y guardar permisos por rol administrable.
- Configurar la cantidad de dias permitidos para editar consultas.

Los endpoints administrativos deben rechazar accesos no administradores con estado `403`.

### 4.8 Importacion y migracion de datos

El sistema debe incluir scripts para importar mutuales, pacientes y consultas desde fuentes legacy. Las consultas legacy deben relacionarse por numero de ficha cuando sea posible.

Tambien deben existir procesos para:

- Crear y poblar la relacion `pacientes.mutual_id`.
- Diagnosticar coincidencias entre obras sociales textuales y mutuales normalizadas.
- Inicializar permisos por rol.
- Inicializar configuracion del sistema.
- Migrar antecedentes fijos hacia pacientes y consultas.

Los scripts administrativos deben autenticarse contra PocketBase usando token administrativo o credenciales.

## 5. Alcance No Funcional

### Seguridad

- Todas las pantallas operativas requieren sesion valida.
- La autenticacion se realiza mediante Google OAuth2.
- Las operaciones administrativas requieren rol `admin`.
- Las llamadas server-side privilegiadas deben usar helpers administrativos de PocketBase.

### Auditoria funcional

- Los cambios de producto deben documentarse mediante OpenSpec antes de implementarse.
- Las specs activas deben validarse con `npm.cmd run openspec:validate`.

### Integridad de datos

- El numero de ficha de paciente no debe duplicarse.
- Los turnos regulares deben respetar disponibilidades.
- Las consultas creadas desde turnos deben actualizar el estado del turno.
- Las recetas deben conservar su relacion opcional con consultas.

### Usabilidad

- Las busquedas principales deben responder a terminos parciales y datos habituales de trabajo: apellido, nombre, DNI, ficha y fecha.
- Las vistas de agenda deben permitir trabajo diario y semanal.
- Las impresiones deben estar optimizadas para el uso operativo del consultorio.

## 6. Modelo de Datos Principal

- `users`: usuarios autenticados, roles y datos basicos.
- `pacientes`: datos personales, documento, ficha, contacto, obra social textual y mutual relacionada.
- `mutuales`: obras sociales o mutuales disponibles.
- `disponibilidades`: bloques horarios para asignacion de turnos.
- `turnos`: citas medicas, estado, motivo, observaciones, paciente y disponibilidad.
- `consultas`: historia clinica oftalmologica y relacion con paciente o turno.
- `recetas`: recetas medicas o de anteojos vinculadas a paciente y opcionalmente consulta.
- `role_permissions`: permisos persistidos por rol administrable.
- `system_settings`: configuraciones operativas del sistema.

## 7. Criterios de Exito

- Un usuario autorizado puede completar el flujo paciente -> turno -> consulta -> receta sin salir del sistema.
- Un paciente puede encontrarse rapidamente por apellido, nombre, documento o ficha.
- El medico puede revisar el historial clinico del paciente y navegar entre consultas.
- La secretaria puede gestionar agenda diaria y sobreturnos con bajo esfuerzo.
- El administrador puede ajustar permisos y configuracion sin cambios de codigo.
- Los datos historicos pueden importarse y diagnosticarse con scripts reproducibles.
- La especificacion OpenSpec se mantiene valida y actualizada.

## 8. Fuera de Alcance Actual

- Integracion con sistemas externos de receta electronica.
- Facturacion, caja o gestion contable.
- Portal de pacientes.
- Notificaciones automaticas por email, SMS o WhatsApp.
- Auditoria clinica avanzada con historial granular de cambios por campo.
- Firma digital de recetas o documentos clinicos.

## 9. Dependencias y Supuestos

- PocketBase esta disponible y configurado mediante `NEXT_PUBLIC_POCKETBASE_URL`.
- Google OAuth2 esta configurado para la coleccion `users`.
- Las colecciones de PocketBase existen con los campos esperados por la aplicacion.
- Los administradores cuentan con `POCKETBASE_ADMIN_TOKEN` o credenciales administrativas para tareas server-side y scripts.
- La migracion legacy depende de la disponibilidad y consistencia de archivos fuente DBF, CSV o XLSX.

## 10. Riesgos

- Inconsistencias en datos legacy pueden impedir asociaciones exactas entre pacientes, mutuales y consultas.
- Cambios en el esquema de PocketBase sin migracion coordinada pueden romper flujos existentes.
- Permisos demasiado amplios para roles operativos podrian exponer funciones administrativas.
- La edicion de consultas fuera de periodo requiere control tanto en UI como en API para evitar inconsistencias.

## 11. Metricas Sugeridas

- Tiempo promedio para encontrar un paciente.
- Cantidad de turnos creados por dia.
- Porcentaje de turnos que terminan vinculados a una consulta.
- Cantidad de consultas editadas fuera del dia de atencion.
- Pacientes sin mutual relacionada luego de migracion.
- Errores de importacion por lote.

## 12. Trazabilidad OpenSpec

Este PRD se deriva de la baseline OpenSpec del proyecto:

- `openspec/specs/access-and-navigation/spec.md`
- `openspec/specs/patient-management/spec.md`
- `openspec/specs/mutual-management/spec.md`
- `openspec/specs/appointment-scheduling/spec.md`
- `openspec/specs/clinical-consultations/spec.md`
- `openspec/specs/prescriptions/spec.md`
- `openspec/specs/administration-and-settings/spec.md`
- `openspec/specs/data-import-and-migration/spec.md`

Todo cambio funcional relevante deberia iniciar con una propuesta OpenSpec y, una vez aprobado e implementado, reflejarse en este PRD si modifica el alcance de producto.
