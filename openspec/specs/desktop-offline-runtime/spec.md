# Desktop Offline Runtime Specification

## Purpose
Define la instalación, ejecución segura, activación y diagnóstico de la aplicación de escritorio offline para Windows.

## Requirements
### Requirement: Aplicación de escritorio instalable
El sistema SHALL distribuir una aplicación instalable para Windows 11 que ejecute la interfaz del consultorio en una ventana propia y preserve sus datos locales entre actualizaciones.

#### Scenario: Primera instalación
- **WHEN** un usuario instala la aplicación en Windows 11
- **THEN** el instalador crea un acceso directo y registra los archivos de la aplicación
- **AND** crea el directorio de datos bajo el perfil del usuario de Windows
- **AND** no requiere que el usuario abra un navegador

#### Scenario: Actualización de aplicación
- **WHEN** se instala una versión posterior sobre una instalación existente
- **THEN** el sistema actualiza los binarios y migraciones
- **AND** conserva la base local, identidad de equipo, operaciones pendientes y conflictos

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
