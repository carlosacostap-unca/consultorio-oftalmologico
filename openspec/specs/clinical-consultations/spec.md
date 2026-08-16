# Clinical Consultations Specification

## Purpose
Define la carga, consulta, edicion, navegacion e impresion de datos clinicos oftalmologicos.
## Requirements
### Requirement: Listado de consultas
El sistema SHALL listar consultas con filtros por paciente, letra inicial y fecha, mostrando por defecto primero las atenciones clinicas mas recientes y el estado operativo de cada consulta.

#### Scenario: Cargar consultas
- **WHEN** el usuario abre `/consultas`
- **THEN** el sistema consulta `consultas` paginadas de a 20
- **AND** ordena por fecha descendente y creacion descendente
- **AND** expande `paciente_id`
- **AND** muestra fecha, paciente, numero de ficha, estado, motivo y diagnostico
- **AND** no muestra fechas futuras en el listado general sin filtro de fecha

#### Scenario: Filtrar por paciente
- **WHEN** el usuario busca por nombre, apellido, documento o ficha
- **THEN** el sistema busca primero pacientes coincidentes
- **AND** filtra consultas por los IDs encontrados

#### Scenario: Filtrar por fecha
- **WHEN** el usuario selecciona una fecha
- **THEN** el sistema muestra consultas entre el inicio y fin de ese dia

### Requirement: Fecha clinica estable de consulta
El sistema SHALL tratar la `fecha` de una consulta como dia clinico de atencion, sin desplazarla por zona horaria al guardar, editar, filtrar, validar editabilidad, listar, ver o imprimir.

#### Scenario: Crear consulta conserva el dia elegido
- **WHEN** el medico crea una consulta con fecha `2026-06-23`
- **THEN** el sistema guarda una representacion estable de esa fecha clinica
- **AND** cualquier vista de consulta muestra `23/06/2026` en Argentina

#### Scenario: Editar consulta conserva el dia elegido
- **WHEN** el usuario edita una consulta y selecciona una fecha desde el control de calendario
- **THEN** el sistema envia al API una fecha clinica estable
- **AND** al volver a abrir la consulta el control de calendario muestra el mismo dia seleccionado

#### Scenario: Evaluar limite de edicion por dia clinico
- **WHEN** el sistema decide si una consulta esta dentro del limite configurable de edicion
- **THEN** compara por dia clinico de consulta
- **AND** no adelanta ni atrasa el dia por convertir medianoche UTC a zona horaria local

#### Scenario: Filtrar consultas por fecha
- **WHEN** el usuario filtra el listado de consultas por una fecha
- **THEN** el sistema incluye las consultas cuyo dia clinico coincide con la fecha seleccionada

### Requirement: Nueva consulta clinica
El sistema SHALL crear consultas asociadas a un paciente con datos medicos oftalmologicos, presentando el formulario como un flujo clinico organizado con campos narrativos multilínea, contexto clinico previo del paciente disponible bajo demanda, auditoria de creacion, acciones de cierre asistidas al finalizar el guardado y una disposicion compacta de escritorio para monitores Full HD.

#### Scenario: Mostrar contexto clinico previo
- **WHEN** el usuario selecciona o abre una nueva consulta con paciente
- **THEN** el sistema permite abrir el contexto clinico previo desde una accion visible al final del formulario
- **AND** el contexto incluye ultimas consultas con fecha, motivo, diagnostico y tratamiento cuando existan
- **AND** incluye recetas recientes con fecha, medicamentos e indicaciones cuando existan
- **AND** permite abrir consultas y recetas previas desde esa seccion
- **AND** en escritorio el contexto no ocupa ancho permanente ni aumenta la altura del documento cuando esta oculto

#### Scenario: Mostrar ocupacion en carga inicial
- **WHEN** el usuario selecciona o abre una nueva consulta con paciente
- **THEN** el sistema muestra la ocupacion del paciente en la misma fila que edad, obra social y domicilio cuando este disponible
- **AND** mantiene edad y ocupacion como campos compactos, con ocupacion despues de domicilio
- **AND** mantiene la fila legible en escritorio y apilada en pantallas angostas

#### Scenario: Formulario clinico organizado
- **WHEN** el usuario abre una nueva consulta
- **THEN** el sistema muestra secciones distinguibles para paciente, antecedentes, motivo, examen oftalmologico, refraccion y cierre clinico
- **AND** mantiene disponibles todos los campos clinicos actuales
- **AND** permite cargar biomicroscopia, fondo de ojo, diagnostico y tratamiento como texto multilínea
- **AND** en un monitor Full HD prioriza que la carga clinica y los controles de guardado queden dentro del area visible de escritorio sin scroll vertical de pagina

#### Scenario: Mostrar fecha clinica en formato local fijo
- **WHEN** el usuario abre o edita la fecha de una nueva consulta
- **THEN** el sistema muestra la fecha como `dd/mm/aaaa`
- **AND** no depende del idioma o configuracion regional del navegador
- **AND** conserva internamente la fecha clinica normalizada para guardar la consulta

#### Scenario: Finalizar consulta desde carga principal
- **WHEN** el usuario completa una nueva consulta desde `/consultas/nueva`
- **THEN** el sistema muestra `Finalizar consulta` como accion de guardado
- **AND** no muestra la accion `Guardar avance`
- **AND** crea la consulta con estado `finalizada`
- **AND** si la consulta proviene de un turno, marca el turno como `Atendido`

#### Scenario: Retornar desde nueva consulta
- **WHEN** el usuario llega al final de la pantalla de nueva consulta
- **THEN** el sistema muestra una accion `Volver` junto con las acciones de cierre
- **AND** no muestra una cabecera superior dedicada a navegacion o contexto

### Requirement: Antecedentes clinicos
El sistema SHALL registrar antecedentes fijos, copiarlos desde el paciente o la consulta anterior cuando corresponda y presentarlos de forma estable al revisar una consulta existente.

#### Scenario: Antecedentes del paciente
- **WHEN** el paciente seleccionado tiene antecedentes fijos
- **THEN** el formulario de consulta los precarga desde `pacientes`
- **AND** muestra un resumen de antecedentes activos

#### Scenario: Respaldo desde ultima consulta
- **WHEN** el paciente no tiene antecedentes fijos cargados
- **THEN** el sistema intenta cargar antecedentes desde la ultima consulta del paciente

#### Scenario: Revisar una consulta de un paciente con enfermedad de base
- **WHEN** el medico abre una consulta existente cuyo paciente tiene un antecedente fijo activo, aunque la consulta no lo tenga registrado
- **THEN** el sistema mantiene activo el chip correspondiente durante la revision
- **AND** una carga asincrona posterior no lo desmarca ni reemplaza con datos de otra consulta

### Requirement: Datos oftalmologicos de consulta
El sistema SHALL registrar motivo, agudeza visual, presion ocular, refraccion, biomicroscopia, fondo de ojo, diagnostico y tratamiento con controles organizados para carga oftalmologica.

#### Scenario: Completar datos clinicos
- **WHEN** el usuario completa el formulario medico
- **THEN** el sistema conserva los campos de agudeza visual, PIO, refraccion de lejos y cerca, ADD, biomicroscopia, fondo de ojo, diagnostico y tratamiento
- **AND** agrupa esos campos por tipo de dato clinico para facilitar la carga
- **AND** el esquema operativo de `consultas` acepta los campos persistidos por el formulario clinico

#### Scenario: Error de esquema al guardar
- **WHEN** PocketBase rechaza el alta de consulta por campos faltantes o validacion de esquema
- **THEN** el sistema informa una causa accionable para corregir el esquema o los datos enviados

#### Scenario: Cargar AV y PIO por ojo
- **WHEN** el usuario carga agudeza visual o presion ocular
- **THEN** el sistema muestra controles equivalentes para OD y OI
- **AND** diferencia AV sin correccion, AV con correccion y PIO

#### Scenario: Cargar refraccion en grilla
- **WHEN** el usuario carga refraccion
- **THEN** el sistema muestra grillas separadas para lejos y cerca
- **AND** cada grilla organiza OD y OI con columnas ESF, CIL y EJE

#### Scenario: Calcular refraccion de cerca con ADD
- **WHEN** el usuario cambia el valor ADD
- **THEN** el sistema copia cilindro y eje de lejos a cerca
- **AND** suma ADD a la esfera de lejos para calcular esfera de cerca

### Requirement: Edicion protegida de consultas
El sistema SHALL limitar la edicion de consultas segun la configuracion `consulta_edit_limit_days` y permitir finalizar consultas editables.

#### Scenario: Consulta editable
- **WHEN** la fecha de consulta esta dentro del limite permitido
- **THEN** el formulario permite editar y guardar mediante `PATCH /api/consultas/[id]`
- **AND** conserva el estado actual salvo que el usuario elija cambiarlo

#### Scenario: Consulta fuera de limite
- **WHEN** la fecha de consulta es anterior al limite configurado
- **THEN** el formulario queda en modo lectura
- **AND** el API rechaza el PATCH con estado 403

#### Scenario: Finalizar consulta existente
- **WHEN** el usuario finaliza una consulta editable
- **THEN** el sistema actualiza `estado = finalizada`
- **AND** registra auditoria del cambio de estado

#### Scenario: Accion de edicion visible para medico
- **WHEN** un medico abre una consulta existente en modo lectura
- **AND** la fecha de consulta esta dentro del limite permitido
- **THEN** el sistema muestra una accion para editar la consulta
- **AND** la accion navega a `/consultas/<id>` sin `mode=view`

#### Scenario: Accion de edicion oculta fuera de limite
- **WHEN** un medico abre una consulta existente en modo lectura
- **AND** la fecha de consulta es anterior al limite configurado
- **THEN** el sistema no muestra la accion para editar la consulta

### Requirement: Navegacion clinica entre consultas
El sistema SHALL permitir navegar dentro del historial de consultas del mismo paciente y revisar una consulta existente con contexto clinico resumido y continuidad de acciones.

#### Scenario: Consultas relacionadas del paciente
- **WHEN** se abre una consulta existente
- **THEN** el sistema carga las consultas del mismo paciente ordenadas por fecha y creacion
- **AND** identifica primera, anterior y posterior respecto de la consulta actual

#### Scenario: Resumen de consulta existente
- **WHEN** se abre una consulta existente
- **THEN** el sistema muestra una cabecera con paciente, fecha, edad, ficha y obra social cuando esten disponibles
- **AND** muestra la fecha de la consulta como `dd/mm/aaaa`, sin depender de la configuracion regional del navegador
- **AND** muestra un resumen clinico con motivo, diagnostico, tratamiento, PIO, AV, refraccion y antecedentes activos
- **AND** muestra un panel de continuidad clinica con estado de diagnostico, tratamiento, recetas emitidas y datos clave del paciente

#### Scenario: Mostrar ocupacion en consulta existente
- **WHEN** se abre una consulta existente asociada a un paciente con ocupacion cargada
- **THEN** el sistema muestra la ocupacion junto con los datos resumidos del paciente
- **AND** la muestra tambien en la fila de datos iniciales del paciente de la consulta despues de domicilio

#### Scenario: Acciones clinicas desde detalle
- **WHEN** se abre una consulta existente
- **THEN** el sistema permite crear receta vinculada a la consulta y al paciente
- **AND** permite imprimir anteojos desde la consulta
- **AND** permite imprimir un informe clinico de la consulta
- **AND** permite abrir el paciente y crear una nueva consulta para el mismo paciente
- **AND** mantiene esas acciones visibles en el panel de continuidad

#### Scenario: Acciones de navegacion al final de la consulta
- **WHEN** el usuario llega al final de una consulta existente
- **THEN** el sistema muestra `Volver` y `Ver contexto` en las acciones inferiores
- **AND** conserva sus comportamientos de retorno y acceso al contexto clinico
- **AND** no muestra una cabecera superior dedicada a esas acciones

### Requirement: Recetas asociadas a consulta
El sistema SHALL mostrar recetas emitidas para una consulta y permitir crear nuevas recetas vinculadas.

#### Scenario: Consulta con recetas
- **WHEN** una consulta tiene recetas con `consulta_id`
- **THEN** el sistema las muestra con fecha, medicamentos, indicaciones y acceso a su vista

#### Scenario: Crear receta desde consulta
- **WHEN** el usuario elige crear receta desde una consulta
- **THEN** el sistema navega a `/recetas/nueva?consulta_id=<consulta>&paciente_id=<paciente>`

### Requirement: Impresion de receta de anteojos
El sistema SHALL generar una hoja imprimible de refraccion de lejos y cerca desde una consulta con datos completos del paciente y contexto clinico.

#### Scenario: Imprimir anteojos
- **WHEN** el usuario abre `/consultas/[id]/imprimir-anteojos`
- **THEN** el sistema carga la consulta con paciente expandido
- **AND** muestra datos del paciente, documento, ficha, cobertura y fecha cuando existan
- **AND** muestra tablas de LEJOS y CERCA para OD y OI con esferico, cilindrico y eje
- **AND** muestra ADD, diagnostico u observaciones clinicas cuando existan
- **AND** permite volver a la consulta desde la vista imprimible

### Requirement: Consultas reasignadas por fusion de pacientes
El sistema SHALL conservar las consultas clinicas al fusionar pacientes duplicados.

#### Scenario: Fusion reasigna consultas
- **WHEN** un paciente duplicado se fusiona con un paciente principal
- **THEN** el sistema actualiza las consultas del duplicado para apuntar al paciente principal
- **AND** el historial clinico del paciente principal incluye esas consultas

#### Scenario: Consultas dejan de apuntar al duplicado
- **WHEN** la fusion finaliza correctamente
- **THEN** no quedan consultas activas asociadas al paciente duplicado
- **AND** el paciente duplicado conserva trazabilidad hacia el paciente principal

### Requirement: Consulta iniciada desde jornada medica
El sistema SHALL conservar el contexto del turno cuando una consulta clinica se inicia desde la jornada diaria del medico y ofrecer retorno directo a la misma jornada al finalizar.

#### Scenario: Precargar consulta desde turno
- **WHEN** el medico abre `/consultas/nueva` con `turno_id`
- **THEN** el sistema carga el turno con paciente asociado
- **AND** precarga paciente, numero de ficha, motivo y antecedentes disponibles

#### Scenario: Finalizar atencion del turno
- **WHEN** el medico guarda una consulta creada desde un turno
- **THEN** el sistema vincula la consulta al turno
- **AND** cambia el turno a `Atendido`
- **AND** muestra una accion para volver a la jornada medica del dia del turno

#### Scenario: Evitar consulta duplicada
- **WHEN** un turno ya tiene una consulta asociada
- **THEN** el sistema dirige al medico a la consulta existente
- **AND** no ofrece crear otra consulta para el mismo turno como accion principal

### Requirement: Impresion de informe clinico de consulta
El sistema SHALL generar una hoja imprimible de la consulta clinica completa y resolver sus antecedentes de forma coherente con la revisión clínica de esa consulta.

#### Scenario: Imprimir informe clinico
- **WHEN** el usuario abre `/consultas/[id]/imprimir`
- **THEN** el sistema carga la consulta con paciente expandido
- **AND** muestra paciente, fecha, motivo, antecedentes, examen oftalmologico, refraccion, diagnostico y tratamiento
- **AND** muestra las recetas asociadas a la consulta cuando existan

#### Scenario: Imprimir una consulta legacy con enfermedad de base
- **WHEN** el usuario imprime una consulta que no tiene registrado un antecedente fijo y el paciente expandido sí lo tiene activo
- **THEN** el informe muestra el antecedente activo del paciente
- **AND** conserva también los antecedentes verdaderos registrados en la consulta
- **AND** no modifica la consulta ni la ficha del paciente

### Requirement: Auditoria de consultas
El sistema SHALL registrar y mostrar eventos de auditoria asociados a cada consulta clinica.

#### Scenario: Crear evento de consulta
- **WHEN** se crea una consulta
- **THEN** el sistema registra un evento asociado a la consulta
- **AND** guarda actor, tipo, titulo, detalle y fecha de creacion

#### Scenario: Editar consulta
- **WHEN** se actualiza una consulta existente
- **THEN** el sistema registra un evento de edicion asociado a la consulta
- **AND** conserva la consulta actualizada aunque el registro de auditoria falle

#### Scenario: Cambiar estado de consulta
- **WHEN** se actualiza el estado de una consulta existente
- **THEN** el sistema registra un evento de auditoria asociado a la consulta
- **AND** guarda estado anterior y estado nuevo en metadata

#### Scenario: Ver historial de auditoria
- **WHEN** el usuario abre el detalle de una consulta
- **THEN** el sistema carga los eventos de auditoria de esa consulta
- **AND** los muestra ordenados por fecha descendente

#### Scenario: Consulta sin eventos
- **WHEN** una consulta no tiene eventos registrados
- **THEN** el sistema informa que aun no hay historial de auditoria para esa consulta

#### Scenario: Reparar consulta sin auditoria
- **WHEN** una consulta creada por la app no tiene registros en `consulta_eventos`
- **THEN** el sistema operativo de mantenimiento puede generar un evento retroactivo minimo
- **AND** el evento conserva la referencia a consulta, paciente, medico asignado, fecha original y motivo cuando existan
- **AND** el proceso debe ofrecer dry-run antes de crear registros

### Requirement: Identificacion del medico responsable
El sistema SHALL mostrar el nombre del medico responsable de una consulta a todo usuario autenticado con permiso para acceder a esa consulta, aunque el responsable sea otro medico y PocketBase no permita expandir su registro de usuario.

#### Scenario: Un medico consulta una atencion de otro medico
- **WHEN** un usuario con rol medico abre el listado o el detalle de una consulta cuyo `medico_id` corresponde a otro medico
- **THEN** el sistema muestra el nombre del medico responsable
- **AND** no depende exclusivamente de `expand.medico_id`

#### Scenario: Un medico imprime una atencion de otro medico
- **WHEN** un usuario con rol medico abre el informe clinico, la receta de anteojos o la historia clinica imprimible que contiene una consulta de otro medico
- **THEN** el documento muestra el nombre del medico responsable correspondiente a `medico_id`

#### Scenario: La consulta no tiene un medico resoluble
- **WHEN** una consulta no tiene `medico_id` o el identificador no corresponde a un medico disponible
- **THEN** el sistema muestra un fallback explicito
- **AND** permite consultar e imprimir el resto de la informacion clinica

#### Scenario: Privacidad de usuarios
- **WHEN** el sistema obtiene nombres para resolver la responsabilidad medica
- **THEN** solo utiliza los datos minimos de identificacion provistos por el endpoint autenticado de medicos
- **AND** no amplia las reglas generales de lectura de la coleccion `users`

#### Scenario: Mostrar medico responsable al crear consulta
- **WHEN** un usuario con rol medico abre una nueva consulta
- **THEN** el sistema muestra el nombre del medico responsable usando el usuario autenticado
- **AND** la consulta se guarda con ese `medico_id`

#### Scenario: Rechazar creacion por usuario no responsable
- **WHEN** un usuario intenta crear una consulta con rol activo distinto de medico
- **OR** intenta asignar un `medico_id` distinto del usuario autenticado
- **THEN** el sistema rechaza la creacion

### Requirement: Consultas clínicas offline
El sistema SHALL permitir crear, ver e imprimir consultas desde la base local sin conexión, manteniendo paciente, médico, fecha clínica y campos oftalmológicos.

#### Scenario: Crear consulta offline
- **WHEN** un médico autenticado guarda una consulta para un paciente local sin conexión
- **THEN** el sistema crea la consulta con ID estable y relación al paciente
- **AND** atribuye `medico_id` al médico autenticado
- **AND** registra una operación pendiente durable

#### Scenario: Consultar historial offline
- **WHEN** un usuario abre el listado, detalle o historia clínica sin conexión
- **THEN** el sistema obtiene las consultas disponibles en la copia local
- **AND** muestra su estado de sincronización sin ocultar contenido clínico guardado

#### Scenario: Imprimir consulta offline
- **WHEN** el usuario abre la vista imprimible de una consulta local
- **THEN** el sistema genera la hoja con los datos locales disponibles
- **AND** indica de forma discreta si el registro todavía está pendiente de confirmación central

### Requirement: Edición offline protegida de consulta
El sistema SHALL conservar los límites de edición clínica también offline y SHALL tratar toda edición concurrente como conflicto conservador.

#### Scenario: Consulta editable en la copia local
- **WHEN** la fecha clínica está dentro del límite almacenado y el rol activo permite editar
- **THEN** el sistema permite guardar localmente
- **AND** conserva la versión base completa para sincronización

#### Scenario: Consulta fuera de límite
- **WHEN** la consulta está fuera del límite de edición disponible
- **THEN** el formulario permanece en modo lectura aun sin conexión

#### Scenario: Cambio central concurrente
- **WHEN** el servidor recibió cambios sobre la consulta después de la versión base local
- **THEN** no sobrescribe la versión central con la edición offline
- **AND** presenta ambas versiones como conflicto clínico auditable

### Requirement: Dependencias locales de consulta
El sistema SHALL impedir que una consulta se sincronice antes que el paciente local del que depende.

#### Scenario: Paciente y consulta creados offline
- **WHEN** una consulta referencia un paciente todavía pendiente
- **THEN** la cola mantiene la consulta detrás del alta de paciente
- **AND** usa el mismo ID de paciente después de la confirmación central

### Requirement: Baja lógica de consulta
El sistema SHALL conservar el historial y representar cualquier eliminación sincronizada de consulta como baja lógica auditable.

#### Scenario: Consulta marcada para eliminación
- **WHEN** una acción autorizada elimina una consulta dentro del flujo sincronizado
- **THEN** el sistema no purga físicamente el contenido clínico
- **AND** registra actor, equipo, fecha y operación pendiente o confirmada

### Requirement: Campos clinicos opcionales vacios
El sistema SHALL mantener vacios los campos clinicos opcionales que no fueron cargados.

#### Scenario: Mostrar consulta con ceros de relleno
- **WHEN** una consulta existente tiene `0`, `+0`, `+0.00` o valores equivalentes en agudeza visual, refraccion, ADD o presion ocular
- **THEN** el formulario muestra esos campos vacios
- **AND** no presenta `0` como valor clinico cargado

#### Scenario: Guardar consulta sin datos opcionales
- **WHEN** el usuario guarda una consulta sin cargar agudeza visual, refraccion, ADD o presion ocular
- **THEN** el sistema persiste esos campos como vacios
- **AND** no guarda ceros de relleno

#### Scenario: Imprimir consulta
- **WHEN** una impresion usa campos clinicos opcionales sin dato real
- **THEN** el sistema no imprime `0` como valor medido

### Requirement: Medico responsable de consulta
El sistema SHALL guardar, expandir, mostrar e imprimir el medico responsable de cada consulta clinica.

#### Scenario: Consulta iniciada desde turno
- **WHEN** se crea una consulta desde un turno con `medico_id`
- **THEN** la consulta guarda ese medico como responsable
- **AND** el detalle de la consulta muestra el nombre del medico

#### Scenario: Consulta libre con seleccion de medico
- **WHEN** se crea una consulta sin turno asociado
- **THEN** el formulario determina el medico desde el usuario medico activo o permite seleccionarlo
- **AND** el sistema no guarda la consulta sin medico responsable cuando el usuario debe seleccionarlo manualmente

#### Scenario: Listado e impresion de consulta
- **WHEN** el usuario ve el listado, detalle o impresion de una consulta
- **THEN** el sistema muestra el medico responsable cuando exista
- **AND** muestra "Medico no registrado" cuando no exista atribucion historica

#### Scenario: Editar medico de consulta
- **WHEN** un usuario con permisos administrativos edita una consulta
- **THEN** puede corregir el medico responsable
- **AND** el cambio queda guardado en `consultas.medico_id`

