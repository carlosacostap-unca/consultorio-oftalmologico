# Patient Management Specification

## Purpose
Define la gestion de pacientes, fichas clinicas, busqueda por padron y relacion con obras sociales/mutuales.
## Requirements
### Requirement: Listado y busqueda de pacientes
El sistema SHALL listar pacientes autenticados con paginacion, orden alfabetico y filtros por apellido, texto libre y numero de ficha.

#### Scenario: Listado inicial
- **WHEN** un usuario autenticado abre `/pacientes`
- **THEN** el sistema consulta `pacientes` ordenado por `apellido,nombre`
- **AND** muestra hasta 100 pacientes por pagina con datos de documento, ficha y obra social

#### Scenario: Busqueda por texto
- **WHEN** el usuario busca por nombre, apellido, documento o ficha
- **THEN** el sistema aplica una busqueda demorada
- **AND** filtra pacientes por todos los terminos ingresados

#### Scenario: Filtro alfabetico
- **WHEN** el usuario selecciona una letra
- **THEN** el sistema filtra pacientes cuyo apellido comienza con esa letra
- **AND** reinicia la paginacion a la primera pagina

### Requirement: Alta de paciente
El sistema SHALL permitir crear pacientes con datos personales, documento, ficha, contacto y cobertura, y SHALL ejecutar las validaciones previas sin requerir permisos administrativos de lectura del esquema de PocketBase.

#### Scenario: Crear paciente con mutual existente
- **WHEN** el usuario completa apellido, nombre, numero de documento y selecciona una mutual
- **THEN** el sistema guarda el paciente en `pacientes`
- **AND** normaliza nombre, apellido y numero de ficha a mayusculas
- **AND** redirige a crear una nueva consulta para el paciente creado

#### Scenario: Calculo de siguiente ficha
- **WHEN** el usuario abre el alta de paciente
- **THEN** el sistema consulta `/api/pacientes/ficha`
- **AND** precarga el siguiente numero de ficha disponible cuando el campo esta vacio

#### Scenario: Ficha duplicada
- **WHEN** el usuario intenta guardar un numero de ficha ya asignado a otro paciente
- **THEN** el sistema informa el paciente duplicado
- **AND** no crea el registro

#### Scenario: DNI duplicado
- **WHEN** el usuario intenta guardar un DNI asignado a otro paciente activo del mismo tipo de documento
- **THEN** el sistema informa el paciente duplicado
- **AND** no crea el registro

#### Scenario: Validacion de DNI con permisos operativos
- **WHEN** el usuario intenta guardar un paciente y las credenciales del servidor pueden consultar registros pero no leer el esquema de PocketBase
- **THEN** el sistema valida el DNI mediante `numero_documento`
- **AND** no requiere acceso a `/api/collections/pacientes` para completar la validacion

#### Scenario: Falla tecnica al validar el DNI
- **WHEN** `/api/pacientes/documento` no puede completar la consulta
- **THEN** el sistema informa que no pudo validar el documento
- **AND** no afirma que la coleccion `pacientes` sea inexistente
- **AND** no intenta crear el registro sin validar el DNI

### Requirement: Creacion rapida de mutual desde paciente
El sistema SHALL permitir crear una mutual durante el alta de paciente si no existe una coincidencia exacta.

#### Scenario: Registrar nueva obra social
- **WHEN** el usuario busca una mutual sin coincidencia exacta
- **THEN** el sistema ofrece registrar la obra social buscada
- **AND** crea la mutual con nombre en mayusculas y datos opcionales de codigo, direccion y telefono
- **AND** selecciona automaticamente la mutual creada para el paciente

### Requirement: Detalle, edicion y vista de paciente
El sistema SHALL permitir ver, editar, eliminar e imprimir pacientes desde `/pacientes/[id]`, y SHALL mostrar una ficha clinica optimizada para el medico en modo lectura.

#### Scenario: Ver paciente
- **WHEN** el usuario abre `/pacientes/[id]?mode=view`
- **THEN** el sistema muestra una ficha clinica de lectura con identificacion del paciente, documento, numero de ficha, contacto, cobertura y antecedentes activos
- **AND** muestra metricas de consultas, recetas y ultima atencion
- **AND** muestra acciones directas para crear una nueva consulta, crear una nueva receta, abrir la ficha imprimible y abrir la ultima consulta cuando exista
- **AND** conserva los datos personales, documento, ficha, contacto y cobertura en modo lectura
- **AND** muestra el historial de consultas del paciente
- **AND** muestra las recetas recientes del paciente con acciones para ver e imprimir

#### Scenario: Imprimir ficha clinica
- **WHEN** el usuario abre `/pacientes/[id]/imprimir`
- **THEN** el sistema carga el paciente, consultas y recetas recientes
- **AND** muestra datos del paciente, documento, ficha, contacto, cobertura y antecedentes activos
- **AND** muestra ultimas consultas con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** muestra recetas recientes con fecha, medicamentos, indicaciones y vinculacion a consulta cuando exista
- **AND** permite imprimir la hoja sin mostrar controles de navegacion en la impresion
- **AND** permite volver a la ficha clinica del paciente desde la vista imprimible

#### Scenario: Editar paciente
- **WHEN** el usuario guarda cambios de un paciente
- **THEN** el sistema actualiza `pacientes`
- **AND** valida que el numero de ficha no pertenezca a otro paciente usando `exclude_id`

#### Scenario: Eliminar paciente
- **WHEN** el usuario confirma la eliminacion
- **THEN** el sistema elimina el registro de `pacientes`
- **AND** regresa al listado de pacientes

### Requirement: Historial clinico desde paciente
El sistema SHALL mostrar las consultas del paciente ordenadas por fecha descendente, una continuidad clinica resumida, una historia clinica unificada y sus recetas recientes asociadas.

#### Scenario: Paciente con consultas
- **WHEN** el paciente tiene consultas registradas
- **THEN** el sistema muestra su continuidad clinica reciente con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** muestra su historial con fecha, motivo y diagnostico
- **AND** cada consulta permite abrir la consulta en modo vista

#### Scenario: Paciente con recetas
- **WHEN** el paciente tiene recetas registradas
- **THEN** el sistema muestra las recetas mas recientes con fecha, indicacion resumida y vinculacion con consulta cuando exista
- **AND** cada receta permite abrir su detalle en modo vista
- **AND** cada receta permite abrir su version imprimible

#### Scenario: Historia clinica unificada
- **WHEN** el paciente tiene consultas o recetas registradas
- **THEN** el sistema muestra una historia clinica unificada con eventos recientes ordenados por fecha descendente
- **AND** cada evento muestra si corresponde a consulta o receta
- **AND** cada evento permite abrir su registro asociado

#### Scenario: Nueva consulta desde ficha
- **WHEN** el usuario elige crear consulta desde el detalle del paciente
- **THEN** el sistema navega a `/consultas/nueva?paciente_id=<id>`

#### Scenario: Nueva receta desde ficha
- **WHEN** el usuario elige crear receta desde el detalle del paciente
- **THEN** el sistema navega a `/recetas/nueva?paciente_id=<id>`

### Requirement: Edicion contextual minima de paciente
El sistema SHALL permitir ediciones administrativas minimas de paciente desde contextos operativos sin reemplazar la ficha completa.

#### Scenario: Editar desde turnos
- **WHEN** un usuario autenticado edita datos administrativos minimos del paciente desde Gestion de Turnos
- **THEN** el sistema guarda los cambios en `pacientes`
- **AND** la ficha completa del paciente conserva esos datos actualizados

#### Scenario: Acceder a ficha completa
- **WHEN** el usuario necesita ver o editar datos fuera del alcance minimo
- **THEN** el sistema ofrece navegacion a `/pacientes/<id>?mode=view`

### Requirement: Advertencia de posibles pacientes duplicados
El sistema SHALL advertir posibles pacientes duplicados cuando un usuario crea o corrige datos administrativos de un paciente.

#### Scenario: Coincidencia exacta de documento, telefono o ficha
- **WHEN** el usuario ingresa un documento, telefono o numero de ficha que coincide con otro paciente
- **THEN** el sistema muestra una advertencia de posible duplicado
- **AND** muestra paciente, documento, telefono, ficha y obra social cuando existan

#### Scenario: Coincidencia por nombre parecido
- **WHEN** el usuario ingresa apellido y nombre similares a otro paciente
- **THEN** el sistema muestra la coincidencia como posible duplicado
- **AND** no bloquea el guardado solo por similitud

#### Scenario: Excluir paciente actual
- **WHEN** el usuario edita un paciente existente desde un contexto operativo
- **THEN** el sistema no muestra al propio paciente como duplicado

### Requirement: Advertencias no destructivas
El sistema SHALL tratar las advertencias de duplicados como informacion operativa y no como fusion automatica.

#### Scenario: Continuar luego de revisar
- **WHEN** el usuario revisa una advertencia de posible duplicado
- **THEN** el sistema permite continuar con el flujo actual
- **AND** no modifica ni fusiona otros pacientes

### Requirement: Pacientes fusionados en gestion de pacientes
El sistema SHALL identificar pacientes fusionados y evitar que aparezcan como pacientes activos en flujos normales.

#### Scenario: Listado omite fusionados por defecto
- **WHEN** un usuario abre el listado normal de pacientes
- **THEN** el sistema muestra pacientes activos
- **AND** omite registros marcados como fusionados salvo que se active una vista administrativa especifica

#### Scenario: Ficha de paciente fusionado
- **WHEN** un usuario abre la ficha de un paciente fusionado
- **THEN** el sistema informa que el registro fue fusionado
- **AND** muestra un enlace al paciente principal

#### Scenario: Crear o editar paciente activo
- **WHEN** un usuario crea o edita un paciente activo
- **THEN** el sistema conserva las validaciones actuales de documento y numero de ficha
- **AND** no considera disponibles los numeros de ficha de pacientes activos

### Requirement: Compatibilidad del filtro web de pacientes activos
El sistema SHALL listar, buscar y validar pacientes en la aplicación web sin depender de campos pertenecientes al esquema opcional de sincronización de escritorio.

#### Scenario: Operar la web sin esquema de escritorio
- **WHEN** PocketBase dispone de los campos del esquema web base y no dispone de `sync_deleted`
- **THEN** los filtros web de pacientes no incluyen `sync_deleted`
- **AND** la validación de documento y el cálculo de siguiente ficha responden sin error de esquema

#### Scenario: Excluir pacientes fusionados
- **WHEN** un flujo web consulta pacientes activos
- **THEN** el sistema excluye los registros cuyo `estado_registro` es `fusionado`
- **AND** no requiere metadatos de sincronización para aplicar ese criterio

#### Scenario: Criterio de escritorio explícito
- **WHEN** un consumidor opera contra un PocketBase con el esquema de sincronización instalado
- **THEN** el criterio que excluye bajas lógicas de escritorio se define separadamente del filtro web base
- **AND** no se aplica implícitamente a entornos que no soportan ese campo

### Requirement: Gestión local de pacientes
El sistema SHALL permitir listar, buscar, crear, ver y editar pacientes desde la base local cuando la aplicación de escritorio no tenga conexión.

#### Scenario: Consultar pacientes offline
- **WHEN** un usuario autenticado abre `/pacientes` sin conexión
- **THEN** el sistema lista y busca sobre la copia local
- **AND** omite registros fusionados o eliminados lógicamente de la vista normal
- **AND** identifica registros con cambios pendientes o conflicto

#### Scenario: Crear paciente offline
- **WHEN** el usuario completa un alta válida sin conexión
- **THEN** el sistema guarda el paciente localmente con ID estable y ficha provisoria
- **AND** registra la operación pendiente atribuida al usuario y equipo
- **AND** permite continuar hacia una nueva consulta para ese paciente

#### Scenario: Editar paciente offline
- **WHEN** el usuario guarda cambios sobre un paciente descargado
- **THEN** el sistema actualiza la copia local inmediatamente
- **AND** conserva la versión base y los campos modificados para detectar conflictos al sincronizar

### Requirement: Validaciones locales y revisión central de paciente
El sistema SHALL ejecutar validaciones posibles con la copia local y SHALL someter las decisiones globales de ficha, documento y duplicidad a confirmación central.

#### Scenario: Duplicado ya presente localmente
- **WHEN** el documento o ficha ingresados coinciden con un paciente activo de la copia local
- **THEN** el sistema muestra la coincidencia
- **AND** aplica las mismas reglas de bloqueo o advertencia del flujo web

#### Scenario: Coincidencia existente sólo en el servidor
- **WHEN** el paciente pasa validaciones locales pero coincide con un registro central más reciente
- **THEN** el servidor no consolida silenciosamente el alta o edición
- **AND** devuelve un conflicto de paciente para revisión

### Requirement: Ficha provisoria visible
El sistema SHALL distinguir una ficha provisoria de una definitiva en todos los flujos locales del paciente.

#### Scenario: Ver paciente todavía pendiente
- **WHEN** un paciente conserva una ficha `TEMP-<EQUIPO>-<SECUENCIA>`
- **THEN** listado, detalle, consulta y receta muestran que la ficha es provisoria
- **AND** las impresiones no la presentan como ficha definitiva

#### Scenario: Recibir ficha definitiva
- **WHEN** la sincronización devuelve la ficha asignada por el servidor
- **THEN** el paciente local conserva su mismo ID
- **AND** todas las vistas posteriores muestran la ficha definitiva sin intervención manual

### Requirement: Baja lógica sincronizable de paciente
El sistema SHALL representar como baja lógica cualquier eliminación de paciente dentro del dominio sincronizado.

#### Scenario: Eliminar paciente desde escritorio
- **WHEN** un usuario autorizado confirma la eliminación
- **THEN** el sistema oculta el paciente de los flujos normales
- **AND** registra una baja lógica pendiente sin borrar consultas, recetas ni evidencia de auditoría

#### Scenario: Baja rechazada o conflictiva
- **WHEN** el servidor no acepta la baja por relaciones o cambios concurrentes
- **THEN** la base local conserva el registro y presenta el conflicto
- **AND** no pierde su historial clínico

