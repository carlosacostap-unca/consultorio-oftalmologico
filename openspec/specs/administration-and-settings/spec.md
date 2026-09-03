# Administration And Settings Specification

## Purpose
Define la administracion de usuarios, roles, permisos operativos y configuracion del sistema.
## Requirements
### Requirement: Roles de usuario
El sistema SHALL reconocer los roles `admin`, `medico` y `secretaria`, y SHALL permitir asignar uno o mas roles validos a cada usuario.

#### Scenario: Etiquetas de roles
- **WHEN** el sistema muestra roles
- **THEN** usa etiquetas Admin, Medico y Secretaria

#### Scenario: Roles administrables
- **WHEN** se gestionan permisos por rol
- **THEN** solo `medico` y `secretaria` son roles administrables
- **AND** `admin` conserva acceso administrativo fuera de esa matriz

#### Scenario: Roles multiples
- **WHEN** un admin asigna varios roles validos a un usuario
- **THEN** el sistema persiste todos los roles seleccionados
- **AND** rechaza listas vacias o roles desconocidos

### Requirement: Matriz de permisos
El sistema SHALL definir permisos por dominios operativos.

#### Scenario: Permisos disponibles
- **WHEN** se carga la pagina de permisos
- **THEN** el sistema muestra permisos de pacientes, consultas, turnos y administracion
- **AND** incluye gestionar mutuales y recetas dentro de administracion

#### Scenario: Permisos por defecto
- **WHEN** no existe configuracion persistida para un rol administrable
- **THEN** el sistema usa los permisos por defecto definidos para `medico` o `secretaria`

### Requirement: Acceso admin a permisos
El sistema SHALL restringir `/permisos` y sus APIs a usuarios cuyo rol activo validado sea `admin`.

#### Scenario: Usuario admin activo
- **WHEN** un usuario con rol `admin` asignado y rol activo `admin` abre `/permisos`
- **THEN** el sistema carga usuarios, permisos por rol y configuracion de consultas

#### Scenario: Usuario admin asignado pero rol operativo activo
- **WHEN** un usuario con roles `admin` y `medico` tiene rol activo `medico` e intenta acceder a permisos
- **THEN** el sistema lo redirige a `/`
- **AND** los endpoints admin responden `403`

#### Scenario: Rol activo no asignado
- **WHEN** un request administrativo informa un rol activo que no esta asignado al usuario autenticado
- **THEN** el endpoint responde `403`

#### Scenario: Usuario no admin
- **WHEN** un usuario autenticado sin rol admin intenta acceder a permisos
- **THEN** el sistema lo redirige a `/`
- **AND** los endpoints admin responden `403`

### Requirement: Gestion de usuarios
El sistema SHALL permitir a administradores crear usuarios, cambiar multiples roles y eliminar usuarios desde la pantalla `/usuarios`, preservando protecciones contra perdida accidental de la cuenta admin activa.

#### Scenario: Crear usuario
- **WHEN** un admin envia email, nombre opcional y uno o mas roles validos a `POST /api/usuarios`
- **THEN** el sistema crea un usuario verificado en PocketBase
- **AND** asigna una contrasena aleatoria porque el ingreso esperado es Google OAuth

#### Scenario: Cambiar roles
- **WHEN** un admin envia `userId` y roles validos a `PATCH /api/usuarios/role`
- **THEN** el sistema actualiza los roles del usuario
- **AND** devuelve id, email, nombre, rol legacy y roles actualizados

#### Scenario: Eliminar usuario
- **WHEN** un admin confirma la eliminacion de un usuario distinto a su propia cuenta
- **THEN** el sistema elimina ese usuario de PocketBase
- **AND** lo quita del listado de usuarios

#### Scenario: Admin no puede eliminar su propia cuenta
- **WHEN** un admin intenta eliminar su propio usuario
- **THEN** el sistema impide la accion
- **AND** conserva la cuenta activa

### Requirement: Restablecimiento administrativo de contraseñas
El sistema SHALL permitir que un usuario con rol activo `admin` establezca una nueva contraseña para una cuenta seleccionada desde `/usuarios`, sin exponer la contraseña en la respuesta del servidor.

#### Scenario: Abrir restablecimiento desde el listado
- **WHEN** un admin selecciona `Restablecer contraseña` en la fila de un usuario
- **THEN** el sistema muestra un modal que identifica la cuenta objetivo
- **AND** solicita nueva contraseña y confirmación

#### Scenario: Validar contraseña en el modal
- **WHEN** la contraseña tiene menos de 8 caracteres o no coincide con la confirmación
- **THEN** el sistema muestra un error
- **AND** no envía la actualización a PocketBase

#### Scenario: Restablecimiento exitoso
- **WHEN** un admin confirma dos contraseñas válidas e iguales
- **THEN** el sistema actualiza la contraseña de la cuenta seleccionada
- **AND** marca `password_configured` como verdadero
- **AND** muestra una confirmación visual sin incluir la contraseña
- **AND** limpia los campos sensibles del modal

#### Scenario: Cuenta activa
- **WHEN** el admin selecciona su propia cuenta desde `/usuarios`
- **THEN** el sistema permite restablecer su contraseña
- **AND** conserva las restricciones existentes para eliminar la cuenta activa o quitar su rol admin

#### Scenario: Usuario sin rol activo admin
- **WHEN** un usuario sin rol activo `admin` llama al endpoint de restablecimiento
- **THEN** el sistema responde `403`
- **AND** no modifica la contraseña del usuario objetivo

#### Scenario: Respuesta sin contraseña
- **WHEN** el endpoint completa el restablecimiento
- **THEN** la respuesta incluye únicamente datos no sensibles de la cuenta y el estado de configuración
- **AND** no incluye `password` ni `passwordConfirm`

### Requirement: Gestion de permisos por rol
El sistema SHALL permitir a administradores persistir permisos para `medico` y `secretaria` desde `/permisos`.

#### Scenario: Cargar permisos
- **WHEN** se llama `GET /api/permisos`
- **THEN** el sistema devuelve permisos normalizados por rol administrable

#### Scenario: Guardar permisos
- **WHEN** un admin guarda permisos para un rol administrable
- **THEN** el sistema filtra permisos desconocidos
- **AND** crea o actualiza el registro correspondiente en `role_permissions`

### Requirement: Configuracion de edicion de consultas
El sistema SHALL administrar la cantidad de dias permitidos para editar consultas.

#### Scenario: Cargar configuracion
- **WHEN** un usuario autenticado llama `GET /api/configuracion`
- **THEN** el sistema devuelve `consultaEditLimitDays`
- **AND** si falla la lectura devuelve el valor por defecto 7

#### Scenario: Guardar configuracion
- **WHEN** un admin llama `PATCH /api/configuracion` con `consultaEditLimitDays`
- **THEN** el sistema normaliza el valor a entero no negativo
- **AND** crea o actualiza la clave `consulta_edit_limit_days` en `system_settings`

### Requirement: Acceso administrativo a PocketBase
El sistema SHALL usar helpers server-side para operar con privilegios administrativos cuando corresponda, SHALL renovar preventivamente una credencial administrativa cacheada que esté vencida o próxima a vencer y SHALL recuperar una operación rechazada sin debilitar la autorización del usuario solicitante.

#### Scenario: Token admin configurado y vigente
- **WHEN** existe `POCKETBASE_ADMIN_TOKEN` con una expiración válida posterior al margen preventivo
- **THEN** el sistema lo usa para llamadas administrativas

#### Scenario: Token administrativo cacheado vencido
- **WHEN** el token administrativo cacheado está vencido o vence dentro del margen preventivo
- **THEN** el sistema lo descarta antes de consultar una colección
- **AND** obtiene un token nuevo mediante las credenciales server-side configuradas

#### Scenario: Token administrativo sin expiración verificable
- **WHEN** el token administrativo cacheado no contiene una expiración válida
- **THEN** el sistema no lo reutiliza
- **AND** intenta obtener una credencial administrativa nueva

#### Scenario: Credenciales admin configuradas
- **WHEN** no existe un token administrativo reutilizable pero existen email y password admin
- **THEN** el sistema obtiene token mediante `/api/collections/_superusers/auth-with-password`
- **AND** si falla intenta `/api/admins/auth-with-password`

#### Scenario: Token administrativo rechazado
- **WHEN** PocketBase responde `401` o `403` a una llamada administrativa y existen email y password admin configurados
- **THEN** el sistema descarta el token rechazado
- **AND** obtiene un nuevo token administrativo
- **AND** reintenta una sola vez la operación original

#### Scenario: Renovación sin credenciales
- **WHEN** el token administrativo no es reutilizable o PocketBase lo rechaza y no existen credenciales para renovarlo
- **THEN** el sistema informa el fallo sin repetir indefinidamente la solicitud

#### Scenario: Autorización del usuario solicitante
- **WHEN** un usuario sin rol activo `admin` intenta invocar una ruta administrativa
- **THEN** el endpoint responde `403`
- **AND** no usa la renovación del token server-side para eludir esa restricción

### Requirement: Permisos efectivos por multiples roles
El sistema SHALL calcular los permisos efectivos de un usuario como la union de permisos de todos sus roles administrables asignados.

#### Scenario: Usuario medico y secretaria
- **WHEN** un usuario tiene roles `medico` y `secretaria`
- **THEN** el sistema considera permitidas las acciones habilitadas para cualquiera de esos roles
- **AND** no duplica permisos repetidos en la respuesta o evaluacion

#### Scenario: Usuario admin con roles operativos
- **WHEN** un usuario tiene rol `admin` y tambien roles operativos
- **THEN** el sistema conserva el acceso administrativo por `admin`
- **AND** los permisos operativos se calculan solo desde roles administrables

### Requirement: Pantalla de gestion de usuarios
El sistema SHALL permitir que administradores con rol activo `admin` gestionen usuarios desde `/usuarios`, incluyendo creacion, roles y eliminacion de usuarios permitidos.

#### Scenario: Listar usuarios
- **WHEN** un admin con rol activo `admin` abre `/usuarios`
- **THEN** el sistema muestra usuarios ordenados por email
- **AND** muestra nombre, email y roles asignados para cada usuario

#### Scenario: Crear usuario desde Usuarios
- **WHEN** un admin crea un usuario desde `/usuarios` con email valido y al menos un rol
- **THEN** el sistema crea el usuario verificado en PocketBase
- **AND** agrega el usuario al listado con sus roles normalizados

#### Scenario: Cambiar roles desde Usuarios
- **WHEN** un admin cambia roles de un usuario desde `/usuarios`
- **THEN** el sistema persiste los roles asignados
- **AND** mantiene el campo legacy `role` compatible con los roles asignados

#### Scenario: Eliminar usuario desde Usuarios
- **WHEN** un admin elimina un usuario distinto a si mismo desde `/usuarios`
- **THEN** la pantalla pide confirmacion
- **AND** si la API confirma el borrado, quita el usuario del listado

#### Scenario: Admin no puede quitar su propio rol admin
- **WHEN** un admin intenta quitarse a si mismo el rol `admin` desde `/usuarios`
- **THEN** el sistema impide la accion
- **AND** conserva el rol `admin` asignado

#### Scenario: Admin no puede eliminarse desde Usuarios
- **WHEN** un admin ve su propio usuario en `/usuarios`
- **THEN** la accion de eliminar no esta disponible para su propia cuenta

### Requirement: API de usuarios
El sistema SHALL exponer endpoints administrativos de usuarios protegidos por rol activo `admin`, incluyendo consulta, creacion, actualizacion de roles y eliminacion.

#### Scenario: Obtener usuarios
- **WHEN** un admin con rol activo `admin` llama `GET /api/usuarios`
- **THEN** el sistema devuelve usuarios ordenados por email
- **AND** cada usuario incluye `id`, `email`, `name`, `role` y `roles`

#### Scenario: Eliminar usuario por API
- **WHEN** un admin con rol activo `admin` llama `DELETE /api/usuarios` con `userId` de otro usuario
- **THEN** el sistema elimina ese registro de `users`
- **AND** devuelve confirmacion de borrado

#### Scenario: Bloquear auto-eliminacion por API
- **WHEN** un admin llama `DELETE /api/usuarios` con su propio `userId`
- **THEN** el endpoint responde `400`
- **AND** no elimina la cuenta activa

#### Scenario: Usuario sin rol activo admin
- **WHEN** un usuario autenticado sin rol activo `admin` llama endpoints administrativos de usuarios
- **THEN** el endpoint responde `403`

### Requirement: Pantalla de edicion de consultas
El sistema SHALL permitir administrar la cantidad de dias permitidos para editar consultas desde `/edicion-consultas`.

#### Scenario: Cargar pantalla de edicion de consultas
- **WHEN** un admin con rol activo `admin` abre `/edicion-consultas`
- **THEN** el sistema muestra solo la seccion de configuracion de consultas
- **AND** carga el valor `consultaEditLimitDays`

#### Scenario: Guardar configuracion de edicion de consultas
- **WHEN** un admin guarda la configuracion desde `/edicion-consultas`
- **THEN** el sistema persiste `consultaEditLimitDays` usando `/api/configuracion`
- **AND** mantiene el valor actualizado en pantalla

#### Scenario: Usuario sin rol activo admin
- **WHEN** un usuario sin rol activo `admin` intenta abrir `/edicion-consultas`
- **THEN** el sistema lo redirige a `/`

### Requirement: Configuracion de recordatorios de turnos
El sistema SHALL permitir administrar la activacion, anticipacion, parametros SMTP, plantilla y prueba de los recordatorios de turnos.

#### Scenario: Cargar configuracion de recordatorios
- **WHEN** un usuario autenticado llama `GET /api/configuracion`
- **THEN** el sistema devuelve si los recordatorios de turnos estan activos
- **AND** devuelve la cantidad de horas de anticipacion configurada
- **AND** devuelve host, puerto, seguridad TLS, usuario y remitente SMTP
- **AND** devuelve si la App Password SMTP esta configurada sin incluir su valor
- **AND** si no existe configuracion usa recordatorios desactivados y 24 horas como valor por defecto

#### Scenario: Guardar configuracion de recordatorios
- **WHEN** un admin llama `PATCH /api/configuracion` con la configuracion de recordatorios
- **THEN** el sistema normaliza la activacion a booleano
- **AND** normaliza las horas de anticipacion a entero positivo
- **AND** crea o actualiza las claves correspondientes en `system_settings`

#### Scenario: Guardar parametros SMTP
- **WHEN** un admin guarda host, puerto, TLS, usuario, remitente y App Password SMTP
- **THEN** el sistema persiste los parametros no sensibles en `system_settings`
- **AND** guarda la App Password como secreto cifrado de solo escritura
- **AND** no devuelve la App Password en la respuesta

#### Scenario: Mantener App Password existente
- **WHEN** un admin guarda la configuracion SMTP sin completar una nueva App Password
- **THEN** el sistema conserva el secreto SMTP existente
- **AND** mantiene el indicador de App Password configurada

#### Scenario: Bloquear secreto sin clave de cifrado
- **WHEN** un admin intenta guardar una App Password SMTP y el servidor no tiene `EMAIL_SETTINGS_ENCRYPTION_KEY`
- **THEN** el endpoint responde error de configuracion
- **AND** no persiste la App Password en texto plano

#### Scenario: Cargar plantilla de recordatorio
- **WHEN** un usuario autenticado llama `GET /api/configuracion`
- **THEN** el sistema devuelve asunto y mensaje configurados para el recordatorio
- **AND** si no existen devuelve los valores por defecto

#### Scenario: Guardar plantilla de recordatorio
- **WHEN** un admin llama `PATCH /api/configuracion` con asunto o mensaje de recordatorio
- **THEN** el sistema normaliza los textos
- **AND** crea o actualiza las claves correspondientes en `system_settings`

#### Scenario: Administrar plantilla desde la UI
- **WHEN** un admin con rol activo `admin` abre `/edicion-consultas`
- **THEN** la pantalla muestra campos para asunto y mensaje del recordatorio
- **AND** muestra las variables disponibles para usar en la plantilla
- **AND** permite guardar la plantilla junto con la configuracion de recordatorios

#### Scenario: Enviar prueba desde la UI
- **WHEN** un admin completa una direccion de prueba y solicita enviar
- **THEN** la pantalla llama el endpoint de prueba
- **AND** informa exito o error sin navegar fuera de la configuracion

### Requirement: Configuracion de horarios medicos
El sistema SHALL permitir administrar horarios recurrentes de medicos desde configuracion.

#### Scenario: Acceso admin a horarios medicos
- **WHEN** un admin con rol activo `admin` abre configuracion
- **THEN** el sistema ofrece una opcion `Horarios medicos`
- **AND** permite crear, editar, activar y desactivar reglas semanales por medico

#### Scenario: Secretaria gestiona horarios medicos
- **WHEN** una secretaria con permiso de turnos abre la configuracion operativa de agenda
- **THEN** el sistema permite gestionar reglas semanales de los medicos
- **AND** no expone opciones administrativas ajenas a la agenda

### Requirement: Configuracion de bloqueos y feriados
El sistema SHALL permitir administrar bloqueos por medico y bloqueos generales del consultorio.

#### Scenario: Crear feriado o cierre general
- **WHEN** admin o secretaria crea un bloqueo general
- **THEN** el sistema lo trata como feriado o cierre del consultorio
- **AND** aplica el bloqueo a todos los medicos y tipos de atencion

#### Scenario: Ver bloqueos existentes
- **WHEN** admin o secretaria abre `Bloqueos y feriados`
- **THEN** el sistema lista bloqueos generales y bloqueos por medico
- **AND** permite identificar alcance, fechas, horario, motivo y creador
