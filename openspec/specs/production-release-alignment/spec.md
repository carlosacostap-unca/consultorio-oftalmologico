# Production Release Alignment Specification

## Purpose
Definir un proceso trazable y verificable para reconciliar ramas, validar el candidato y publicar releases web sin exponer capacidades incompletas ni ejecutar mutaciones implícitas de datos.

## Requirements

### Requirement: Reconciliación trazable de ramas
El proceso de release MUST integrar las historias vigentes de `main` y `develop` sin perder correcciones exclusivas ni reintroducir deuda ya resuelta.

#### Scenario: Preparar una rama de release
- **WHEN** `main` y `develop` contienen commits exclusivos
- **THEN** la rama de release parte de un SHA identificado y fusiona la otra historia de manera trazable
- **AND** registra los SHA de origen, el ancestro común y los conflictos resueltos

#### Scenario: Preservar correcciones de ambas ramas
- **WHEN** una rama contiene una corrección exclusiva sobre impresiones, antecedentes u otro flujo clínico
- **THEN** el resultado reconciliado conserva el comportamiento corregido
- **AND** no restaura `any`, reglas relajadas ni implementaciones anteriores que contradigan el baseline vigente

### Requirement: Capacidades incompletas controladas
El release MUST impedir que una capacidad incompleta quede expuesta a usuarios o actores no autorizados por el solo hecho de estar presente en `develop`.

#### Scenario: Interfaz exclusiva de escritorio en el build web
- **WHEN** el build contiene componentes de activación o sincronización de escritorio
- **THEN** la navegación web ordinaria no presenta esas acciones fuera del runtime previsto
- **AND** los flujos web clínicos continúan disponibles sin depender del almacén local

#### Scenario: API mutante de sincronización
- **WHEN** un cliente invoca una ruta `/api/desktop-sync/v1/*` que lee o modifica datos
- **THEN** la ruta valida autenticación, autorización y contexto de equipo antes de operar
- **AND** rechaza solicitudes que no satisfacen el contrato de seguridad correspondiente

#### Scenario: Aislamiento no demostrable
- **WHEN** la revisión no puede demostrar que una capacidad incompleta está aislada o autorizada
- **THEN** el release permanece bloqueado
- **AND** la capacidad se corrige o se desactiva explícitamente antes de publicar

### Requirement: Barrera reproducible de release
La rama reconciliada MUST superar controles de seguridad, análisis estático, tipos, pruebas y un build Docker versionado desde una instalación limpia antes de integrarse en `main`.

#### Scenario: Verificación técnica completa
- **WHEN** la reconciliación de ramas queda resuelta
- **THEN** `npm ci`, las auditorías requeridas, `npm run lint`, TypeScript y `npm run build` terminan correctamente
- **AND** el build genera la salida standalone esperada sin incorporar configuración de staging

#### Scenario: Construcción Docker reproducible
- **WHEN** Dokploy construye el candidato web
- **THEN** usa el Dockerfile versionado del repositorio con Node.js 22 y no depende del builder Nixpacks
- **AND** la imagen final contiene la salida standalone, los archivos estáticos y los recursos públicos necesarios para iniciar `node server.js`

#### Scenario: Verificación de regresiones críticas
- **WHEN** se valida el candidato a producción
- **THEN** las pruebas focalizadas y E2E cubren autenticación, turnos, consultas, recetas, antecedentes persistentes, alta por DNI e impresiones con médico responsable
- **AND** las pruebas con escrituras se ejecutan sólo contra un PocketBase de testing o staging aceptado por las guardas

### Requirement: Contenedor web sin secretos persistidos
La imagen web MUST separar la construcción de la configuración sensible de ejecución y MUST ejecutar el servidor con privilegios mínimos.

#### Scenario: Construir sin credenciales privadas
- **WHEN** Dokploy construye la imagen versionada del consultorio
- **THEN** el Dockerfile no recibe credenciales de PocketBase, iDrive e2 ni cifrado como argumentos de build
- **AND** los archivos `.env*` quedan excluidos del contexto enviado al daemon de Docker

#### Scenario: Incorporar configuración pública del cliente
- **WHEN** Dokploy construye el bundle web de staging o producción
- **THEN** proporciona explícitamente `NEXT_PUBLIC_POCKETBASE_URL` como argumento público de build
- **AND** la construcción falla con un mensaje claro si la URL pública está ausente

#### Scenario: Iniciar con variables de ejecución
- **WHEN** Dokploy inicia el contenedor en staging o producción
- **THEN** las variables privadas se inyectan en tiempo de ejecución desde la configuración del entorno
- **AND** el proceso de Next.js se ejecuta como un usuario sin privilegios

### Requirement: Publicación deliberada y verificable
El proceso de release MUST identificar el destino efectivo y obtener aprobación explícita antes de modificar la rama o el entorno tratado como producción.

#### Scenario: Destino de despliegue desconocido
- **WHEN** GitHub no demuestra qué proveedor, proyecto, rama y commit alimentan producción
- **THEN** el proceso obtiene esos datos del proveedor antes de fusionar en `main`
- **AND** no asume que un merge equivale a un despliegue exitoso

#### Scenario: Despliegue completado
- **WHEN** se fusiona el PR aprobado y el proveedor termina el despliegue
- **THEN** se compara el SHA desplegado con el SHA esperado del release
- **AND** se ejecutan smoke tests no destructivos sobre los flujos críticos

#### Scenario: Smoke test fallido
- **WHEN** una verificación posterior detecta una regresión bloqueante
- **THEN** se detienen nuevas publicaciones y operaciones de datos
- **AND** se revierte el merge mediante un commit trazable y se confirma el retorno al SHA estable anterior

### Requirement: Reconciliación sin mutaciones implícitas de datos
La integración Git y el despliegue web SHALL conservar los datos existentes y no ejecutar automáticamente migraciones, seeds ni importaciones.

#### Scenario: Publicar el candidato web
- **WHEN** el proveedor construye y despliega la rama reconciliada
- **THEN** el proceso no ejecuta scripts de esquema, seeds de prueba ni importaciones DBF como efecto del build o inicio
- **AND** cualquier operación de PocketBase requerida se evalúa, autoriza y verifica por separado
