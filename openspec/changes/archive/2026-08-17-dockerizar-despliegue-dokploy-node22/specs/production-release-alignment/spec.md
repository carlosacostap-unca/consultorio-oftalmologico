## ADDED Requirements

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

## MODIFIED Requirements

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
