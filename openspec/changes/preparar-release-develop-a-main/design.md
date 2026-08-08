## Context

Al iniciar este cambio, `origin/main` apunta a `9d30848` y `origin/develop` a `38f3627`, con ancestro común `65c942c`. `main` tiene cinco commits propios y `develop` veintiocho; dos correcciones de antecedentes son equivalentes entre ramas, mientras `fbd817b` aporta a `main` la resolución del médico responsable en impresiones. La simulación de merge detecta un conflicto textual en `app/consultas/[id]/page.tsx`, donde la versión de `develop` reemplaza un `any[]` por `Receta[]`.

El estado final también difiere en dependencias y controles: `main` usa Next.js 16.2.6 y `eslint`, mientras `develop` usa Next.js 16.3.0 y `eslint --max-warnings=0`. La auditoría vigente informa cero vulnerabilidades y Next.js 16.3.0 es la versión estable actual. GitHub no registra deployments para el repositorio, por lo que el proveedor, proyecto y rama que alimentan producción deben comprobarse antes de integrar en `main`.

`develop` contiene además el runtime y las APIs de escritorio offline. Su OpenSpec conserva nueve tareas pendientes relacionadas con pruebas de interrupción, sincronización, conflictos, impresiones, instalador y piloto. La reconciliación debe distinguir entre código de servidor necesario y una capacidad incompleta expuesta a usuarios web.

## Goals / Non-Goals

**Goals:**

- Construir una rama de release que preserve las historias y correcciones efectivas de `main` y `develop`.
- Resolver conflictos con tipos explícitos y sin revertir el baseline de lint.
- Demostrar que el código de escritorio presente en el build web está correctamente aislado y autorizado, o bloquear la publicación hasta corregirlo.
- Obtener evidencia reproducible de seguridad, compilación y comportamiento clínico antes y después del despliegue.
- Mantener una referencia de rollback sin reescribir la historia remota.

**Non-Goals:**

- Completar las nueve tareas restantes de la versión de escritorio dentro de este cambio.
- Actualizar React, PocketBase u otras dependencias no necesarias para reconciliar las ramas.
- Ejecutar migraciones, seeds, importaciones DBF o cambios de esquema de PocketBase.
- Agregar nuevas funciones clínicas o administrativas.

## Decisions

### 1. Reconciliar con un merge real sobre una rama nacida de `develop`

La rama de release parte del `origin/develop` verificado y fusiona `origin/main` sin rebase ni cherry-pick masivo. Esto conserva la procedencia de ambos historiales, reconoce las correcciones equivalentes y permite que el PR final hacia `main` muestre exactamente lo que se publicará.

La alternativa de reemplazar `main` con `develop` se descarta porque perdería la corrección exclusiva `fbd817b`. La alternativa de cherry-pickear veintiocho commits se descarta por el riesgo de omisiones y duplicación de cambios equivalentes.

### 2. Resolver el conflicto conservando el contrato tipado

El conflicto conocido en `app/consultas/[id]/page.tsx` se resuelve con `Receta[]`, preservando los tipos incorporados por el saneamiento de ESLint. Después del merge se revisarán todos los archivos modificados en ambos lados, aunque Git no marque conflicto textual, con foco en impresiones y atribución médica.

No se aceptará una resolución que restaure `any`, suprima reglas o elimine la corrección del médico responsable.

### 3. Tratar la exposición del escritorio como barrera de release

Se inventariarán componentes, navegación y rutas `/api/desktop-sync/v1/*`. La interfaz exclusiva de escritorio debe depender de la detección del runtime correspondiente; las APIs deben conservar autenticación, autorización por usuario/equipo e idempotencia. Si una ruta mutante puede ser usada por un actor no autorizado o una pantalla incompleta aparece en la web ordinaria, el release se bloquea y se corrige o se desactiva de forma explícita.

La alternativa de eliminar todo el código de escritorio del release se descarta inicialmente porque sus APIs pueden ser necesarias para clientes activados. La alternativa de publicarlo sin auditoría se descarta por ampliar la superficie de ataque y por el estado incompleto del cambio.

### 4. Separar la reconciliación de nuevas actualizaciones de dependencias

El release conserva Next.js 16.3.0 y el lockfile ya verificado. Las actualizaciones disponibles de React y PocketBase se atienden en otro cambio para mantener acotada la causa de cualquier regresión. Antes de publicar se ejecutan `npm ci`, auditoría, lint estricto, TypeScript, pruebas locales, circuitos E2E críticos y build standalone.

### 5. Identificar el despliegue efectivo antes de tocar `main`

Antes de marcar el PR como listo se debe confirmar el proveedor, proyecto, rama de producción, rama de staging y commit actualmente desplegado. La ausencia de deployments en GitHub impide inferir esos datos. La publicación requiere aprobación explícita una vez mostrados el diff, las verificaciones y el destino.

### 6. Rollback mediante revert del merge

Se registra el SHA previo de `main`, el SHA del PR y el SHA observado en el proveedor. Si falla el smoke test, se detiene cualquier operación adicional y se revierte el merge mediante un nuevo commit. No se fuerza `main` ni se modifica PocketBase para intentar ocultar una regresión de la aplicación.

## Risks / Trade-offs

- **[La rama de release incluye una capacidad de escritorio incompleta]** → inventariar exposición web y autorización de APIs; bloquear la publicación si no puede demostrarse aislamiento suficiente.
- **[Un merge limpio puede resolver de forma incorrecta cambios semánticos]** → revisar manualmente impresiones, atribución médica, antecedentes y los archivos modificados por ambas ramas.
- **[El proveedor puede desplegar una rama distinta de `main`]** → verificar configuración y SHA reales antes y después; no equiparar merge con despliegue.
- **[Los E2E pueden tocar datos reales]** → ejecutar sólo contra PocketBase de testing o staging aceptado por las guardas; realizar en producción únicamente smoke tests no destructivos.
- **[El rollback del frontend no revierte cambios de datos]** → este release no ejecuta migraciones ni seeds y documenta por separado cualquier requisito de esquema ya existente.

## Migration Plan

1. Actualizar `origin/main` y `origin/develop` y registrar sus SHA.
2. Fusionar `origin/main` en la rama de release nacida de `develop`.
3. Resolver el conflicto tipado y revisar la corrección exclusiva de impresiones.
4. Auditar el aislamiento y la autorización del runtime de escritorio.
5. Instalar desde cero y ejecutar todas las barreras de seguridad y calidad.
6. Abrir un PR hacia `main` y comprobar nuevamente mergeabilidad, diff y commit de cabeza.
7. Confirmar proveedor, ramas y SHA desplegados; obtener aprobación antes del merge.
8. Fusionar, esperar el despliegue, comprobar el SHA efectivo y ejecutar smoke tests no destructivos.
9. Si falla una verificación, revertir el merge y confirmar que el proveedor vuelve al SHA estable anterior.

## Open Questions

- ¿Qué proveedor y proyecto despliegan actualmente producción y staging, y qué ramas observan?
- ¿Las APIs de sincronización de escritorio deben quedar disponibles en producción web para un piloto actual o deben permanecer deshabilitadas hasta completar las nueve tareas pendientes?
- ¿El proveedor permite promover exactamente un deployment de staging ya verificado a producción o siempre reconstruye desde `main`?
