# Desktop Offline Runtime Specification

## Purpose
Define la instalación, ejecución segura, activación y diagnóstico de la aplicación de escritorio offline para Windows.
## Requirements
### Requirement: Aplicación de escritorio instalable
El sistema SHALL distribuir una aplicación instalable y actualizable desde la propia interfaz para Windows 11 x64, ejecutará el consultorio en una ventana propia y preservará sus datos locales entre versiones.

#### Scenario: Primera instalación
- **WHEN** un usuario instala la aplicación en Windows 11 x64
- **THEN** el instalador crea un acceso directo y registra los archivos de la aplicación
- **AND** crea el directorio de datos bajo el perfil del usuario de Windows
- **AND** no requiere que el usuario abra un navegador

#### Scenario: Actualización de aplicación
- **WHEN** se instala una versión posterior sobre una instalación existente
- **THEN** el sistema actualiza los binarios y migraciones
- **AND** conserva la base local, identidad de equipo, operaciones pendientes y conflictos

#### Scenario: Detectar y descargar una actualización
- **WHEN** la aplicación empaquetada dispone de sesión central y detecta una versión superior autorizada
- **THEN** descarga la actualización en segundo plano sin bloquear la consulta ni la escritura local
- **AND** muestra versión, tipo y progreso sin exponer detalles técnicos sensibles

#### Scenario: Actualización lista para instalar
- **WHEN** la descarga y las verificaciones terminan correctamente
- **THEN** la aplicación ofrece `Reiniciar y actualizar` y `Más tarde` cuando la política permite posponer
- **AND** nunca cierra la aplicación ni ejecuta el instalador sin completar el flujo controlado

#### Scenario: Aplicar versión posterior
- **WHEN** el usuario confirma `Reiniciar y actualizar` después de crear un respaldo válido
- **THEN** el sistema detiene ordenadamente los servicios locales y ejecuta el instalador NSIS
- **AND** actualiza los binarios y migraciones
- **AND** conserva la base local, identidad de equipo, secretos cifrados, operaciones pendientes y conflictos

#### Scenario: Consulta de actualización sin red
- **WHEN** el equipo está offline o el servidor de actualización no responde
- **THEN** la aplicación inicia y continúa operando con la versión instalada
- **AND** reintenta después de recuperar conectividad sin mostrar una interfaz de error bloqueante

#### Scenario: Plataforma no soportada
- **WHEN** la aplicación detecta una plataforma distinta de Windows 11 x64
- **THEN** no descarga ni ejecuta el artefacto incompatible
- **AND** informa qué plataforma fue detectada y cuál está soportada

### Requirement: Servicios locales aislados
El sistema SHALL ejecutar la aplicación Next.js y PocketBase local sólo en la interfaz loopback del equipo y SHALL impedir que la ventana obtenga acceso general a Node.js.

#### Scenario: Inicio normal
- **WHEN** el usuario abre la aplicación
- **THEN** el proceso principal inicia los servicios locales en `127.0.0.1`
- **AND** abre la ventana cuando ambos servicios están saludables
- **AND** mantiene `nodeIntegration` deshabilitado y aislamiento de contexto habilitado

#### Scenario: Servicio local no disponible
- **WHEN** Next.js o PocketBase local no puede iniciar
- **THEN** el sistema no abre una interfaz operativa incompleta
- **AND** muestra un error recuperable con acceso al diagnóstico técnico

### Requirement: Identidad durable de equipo
El sistema SHALL asignar a cada instalación una identidad única y un código corto persistente para auditoría y fichas provisorias.

#### Scenario: Activar equipo nuevo
- **WHEN** se activa una instalación por primera vez
- **THEN** el sistema genera un `device_id` no reutilizable
- **AND** registra el código corto autorizado para ese equipo
- **AND** conserva ambos valores tras reinicios y actualizaciones

### Requirement: Activación inicial online
El sistema SHALL exigir conexión con el servidor central para activar un equipo y descargar la copia operativa inicial.

#### Scenario: Activación exitosa
- **WHEN** un usuario autorizado ingresa email y contraseña con Internet disponible
- **THEN** el sistema valida la cuenta contra el servidor central
- **AND** registra el equipo y descarga usuarios habilitados, referencias necesarias, pacientes, consultas y recetas permitidos
- **AND** habilita el uso local sólo después de completar y verificar el bootstrap

#### Scenario: Activación interrumpida
- **WHEN** se corta la conexión durante la descarga inicial
- **THEN** el sistema no presenta la copia incompleta como lista para operar
- **AND** permite reanudar o reiniciar el bootstrap de manera idempotente

### Requirement: Autenticación offline segura
El sistema SHALL permitir el ingreso offline con email y contraseña sólo a usuarios previamente activados en ese equipo y SHALL preservar la atribución a su identidad central.

#### Scenario: Usuario activado sin Internet
- **WHEN** un usuario previamente activado ingresa credenciales válidas sin conexión
- **THEN** PocketBase local valida las credenciales sin almacenar una contraseña reversible
- **AND** la sesión conserva el ID central, email, roles y médico asociado
- **AND** la interfaz informa que trabaja offline y la antigüedad de la última validación central

#### Scenario: Usuario no activado sin Internet
- **WHEN** una cuenta que nunca fue activada en el equipo intenta ingresar sin conexión
- **THEN** el sistema rechaza el ingreso
- **AND** indica que necesita conectarse para activar esa cuenta

#### Scenario: Usuario que sólo dispone de Google
- **WHEN** un usuario intenta habilitar el modo offline sin contraseña propia
- **THEN** el sistema exige configurar una contraseña con conexión antes de completar la activación

### Requirement: Protección de datos y secretos locales
El sistema SHALL proteger los secretos del dispositivo con las capacidades criptográficas de Windows y SHALL mantener la base local fuera del directorio reemplazable de instalación.

#### Scenario: Guardar credenciales técnicas
- **WHEN** la aplicación conserva token central o credenciales administrativas locales
- **THEN** cifra esos valores mediante el almacén seguro ligado al usuario de Windows
- **AND** nunca registra tokens, contraseñas ni secretos en logs

#### Scenario: Cerrar servicios
- **WHEN** el usuario cierra la aplicación
- **THEN** el proceso principal detiene ordenadamente Next.js y PocketBase local
- **AND** conserva en disco toda operación confirmada localmente

### Requirement: Diagnóstico sin exposición clínica
El sistema SHALL mantener logs técnicos rotados y permitir obtener un diagnóstico que identifique fallas sin exportar cuerpos clínicos completos.

#### Scenario: Exportar diagnóstico
- **WHEN** el usuario solicita información para soporte
- **THEN** el sistema incluye versión, equipo, salud de servicios, IDs y estados de sincronización y errores sanitizados
- **AND** excluye contraseñas, tokens y contenido narrativo de consultas o recetas

### Requirement: Búsqueda de actualizaciones configurada y observable
La aplicación de escritorio SHALL resolver la URL central desde su configuración explícita o desde la activación cifrada del equipo y SHALL comunicar de forma visible el resultado de toda búsqueda manual de actualizaciones.

#### Scenario: Equipo activado sin variables de entorno
- **WHEN** una instalación empaquetada no dispone de variables de entorno para la URL central pero conserva una activación cifrada válida
- **THEN** el actualizador utiliza `centralAppUrl` de esa activación para consultar la política autorizada
- **AND** no exige reinstalar ni volver a activar el equipo

#### Scenario: Configuración central ausente
- **WHEN** el usuario solicita buscar actualizaciones y no existe una URL central válida en el entorno ni en la activación
- **THEN** la aplicación informa que falta configurar la conexión central
- **AND** registra el motivo de forma sanitizada sin bloquear el trabajo local

#### Scenario: Sesión central ausente o vencida
- **WHEN** el usuario solicita buscar actualizaciones sin un token central vigente
- **THEN** la aplicación informa que debe volver a iniciar sesión para buscar actualizaciones
- **AND** conserva operativa la versión instalada y los datos locales

#### Scenario: Versión instalada vigente
- **WHEN** el servidor confirma que no existe una versión autorizada superior
- **THEN** la interfaz informa que la aplicación está actualizada
- **AND** conserva la fecha de la comprobación

#### Scenario: Error de red o del servidor de actualizaciones
- **WHEN** la consulta no puede completarse por conectividad o por una respuesta inválida del servidor
- **THEN** la interfaz informa que no pudo buscar la actualización y permite reintentar
- **AND** el diagnóstico registra el resultado sin exponer tokens, firmas ni URLs con parámetros sensibles

### Requirement: Respaldo verificable antes de actualizar
La aplicación MUST crear y verificar un respaldo consistente de todos los datos locales durables antes de reemplazar binarios o ejecutar nuevas migraciones.

#### Scenario: Preparar la instalación
- **WHEN** el usuario confirma una actualización validada
- **THEN** la aplicación impide nuevas escrituras, finaliza ordenadamente cualquier sincronización y detiene Next.js y PocketBase local
- **AND** respalda la base, identidad, secretos cifrados y estado de sincronización en un directorio separado de la instalación y de la base activa

#### Scenario: Verificar el respaldo
- **WHEN** finaliza la copia previa
- **THEN** la aplicación verifica el manifiesto, hashes, versión de origen y archivos indispensables
- **AND** conserva al menos los tres últimos respaldos válidos sin eliminar el único disponible

#### Scenario: Respaldo fallido
- **WHEN** el respaldo no puede crearse o verificarse
- **THEN** la aplicación aborta la instalación y conserva intacta la versión vigente
- **AND** vuelve a habilitar el runtime o muestra una recuperación segura con acceso al diagnóstico

### Requirement: Inicio seguro después de actualizar
La aplicación MUST validar servicios, migraciones y acceso a la base local antes de presentar la versión nueva como operativa.

#### Scenario: Primer inicio exitoso
- **WHEN** la versión actualizada inicia por primera vez
- **THEN** ejecuta migraciones locales idempotentes y comprueba la salud de PocketBase y Next.js
- **AND** confirma la nueva versión sin alterar identidad, pendientes ni conflictos existentes

#### Scenario: Migración o servicio nuevo fallido
- **WHEN** una migración o servicio no puede iniciar con la versión nueva
- **THEN** la aplicación no abre una interfaz clínica parcial
- **AND** muestra la ubicación del respaldo verificado y un diagnóstico sanitizado para recuperación asistida
