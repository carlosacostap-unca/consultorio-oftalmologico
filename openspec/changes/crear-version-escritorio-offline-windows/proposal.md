## Why

El consultorio necesita continuar registrando atenciones cuando Internet o el servidor central no están disponibles, sin perder la trazabilidad del médico ni exponer datos clínicos a sobrescrituras silenciosas. La propuesta comercial aceptada requiere una primera versión instalable en Windows 11 que reutilice la aplicación actual y sincronice de forma segura pacientes, consultas y recetas.

## What Changes

- Incorporar una aplicación de escritorio instalable para Windows 11, iniciada desde un acceso directo y capaz de ejecutar la interfaz actual sin depender del navegador del usuario.
- Incorporar una base de datos local por equipo, cifrada o protegida por el sistema operativo, con una copia operativa de usuarios habilitados, pacientes, consultas y recetas.
- Permitir una activación inicial con Internet y el inicio posterior con credenciales propias almacenadas mediante un verificador seguro para los usuarios previamente habilitados en ese equipo.
- Enrutar las lecturas y escrituras de pacientes, consultas y recetas a una capa de datos que funcione tanto contra PocketBase como contra el almacén local.
- Registrar operaciones locales pendientes con identificadores estables, médico, equipo, fecha local, versión base y campos modificados.
- Sincronizar en dos etapas: enviar operaciones pendientes al servidor autoritativo y luego descargar cambios centrales confirmados mediante un cursor por equipo.
- Asignar fichas provisorias con formato `TEMP-<EQUIPO>-<SECUENCIA>` a pacientes creados sin conexión y reemplazarlas por la ficha definitiva confirmada por el servidor.
- Detectar y fusionar automáticamente cambios de pacientes sobre campos distintos; crear conflictos visibles cuando se modifique el mismo campo sensible o no sea segura la fusión.
- Conservar consultas y recetas de manera conservadora, evitando sobrescrituras silenciosas y manteniendo versiones o correcciones auditables.
- Incorporar una pantalla de sincronización con estado de conectividad, última sincronización, pendientes, errores y conflictos resolubles por un usuario autorizado.
- Incorporar esquemas y endpoints de PocketBase para aceptar operaciones idempotentes, asignar fichas definitivas, mantener cursores y registrar conflictos/auditoría.
- Agregar pruebas automatizadas del modo offline, reconexión, idempotencia, fichas provisorias, conflictos y aislamiento entre equipos, además del proceso de empaquetado del instalador.

## Capabilities

### New Capabilities

- `desktop-offline-runtime`: Instalación, activación, identidad del equipo, sesión offline segura, base local y ejecución de la aplicación en Windows 11.
- `offline-data-synchronization`: Cola durable, protocolo bidireccional, fichas provisorias, cursores, idempotencia, auditoría, detección y resolución de conflictos.

### Modified Capabilities

- `access-and-navigation`: El acceso por email y contraseña deberá poder continuar offline para usuarios previamente activados y la navegación mostrará el estado de sincronización.
- `patient-management`: El alta, listado, detalle y edición de pacientes deberán operar sobre datos locales cuando no exista conexión, incluyendo fichas provisorias y posibles duplicados.
- `clinical-consultations`: La creación y consulta de atenciones deberá funcionar offline con atribución al médico autenticado, cola durable y conservación del historial.
- `prescriptions`: La creación, consulta e impresión de recetas deberá funcionar offline y sincronizarse sin sobrescrituras silenciosas.

## Impact

- Afecta la aplicación Next.js, especialmente `lib/pocketbase.ts`, los flujos de autenticación y las pantallas de pacientes, consultas y recetas, que deberán depender de una abstracción de datos compatible con web y escritorio.
- Agrega un proceso principal de escritorio, un puente seguro entre la ventana y servicios nativos, una instancia PocketBase local aislada en `127.0.0.1`, migraciones, empaquetado e instalador para Windows 11.
- Agrega dependencias de escritorio, persistencia SQLite, pruebas de integración y utilidades criptográficas del sistema operativo.
- Requiere ampliar el esquema de PocketBase y sus reglas/endpoints para sincronización idempotente, versiones, cursores, fichas definitivas, auditoría y conflictos; no requiere reemplazar el servidor ni cambiar de proveedor de infraestructura.
- La migración inicial es aditiva: los registros centrales actuales se conservan y reciben metadatos de versión/sincronización. La descarga inicial crea la copia local del equipo sin modificar los datos clínicos existentes.
- Quedan fuera de esta etapa turnos, mutuales, configuraciones administrativas completas, sincronización de archivos adjuntos y soporte para sistemas distintos de Windows 11.
