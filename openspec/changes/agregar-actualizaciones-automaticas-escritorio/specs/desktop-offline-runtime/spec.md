## MODIFIED Requirements

### Requirement: Aplicación de escritorio instalable
El sistema SHALL distribuir una aplicación instalable y actualizable desde la propia interfaz para Windows 11 x64, ejecutará el consultorio en una ventana propia y preservará sus datos locales entre versiones.

#### Scenario: Primera instalación
- **WHEN** un usuario instala la aplicación en Windows 11 x64
- **THEN** el instalador crea un acceso directo y registra los archivos de la aplicación
- **AND** crea el directorio de datos bajo el perfil del usuario de Windows
- **AND** no requiere que el usuario abra un navegador

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

## ADDED Requirements

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
