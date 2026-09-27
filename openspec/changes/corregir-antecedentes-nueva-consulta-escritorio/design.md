## Context

`/consultas/nueva` recibe frecuentemente `paciente_id` desde la ficha clinica. El estado inicial ya contiene ese identificador, pero la ficha completa se obtiene de manera asincronica. Mientras la coleccion local de pacientes aun esta vacia, el efecto de antecedentes interpreta que no encontro datos en el paciente e inicia prematuramente la consulta historica de respaldo. Si esa solicitud termina despues de cargar la ficha, sus valores pueden sobrescribir los antecedentes correctos.

La pantalla es un Client Component porque usa PocketBase en el navegador, estado interactivo y APIs del runtime de escritorio. La correccion debe conservar este patron y funcionar con latencias distintas tanto contra PocketBase central como local.

## Goals / Non-Goals

**Goals:**

- Esperar a que la ficha del paciente seleccionado este disponible antes de decidir si corresponde el respaldo historico.
- Combinar los campos `ant_*` de `pacientes` y de la ultima consulta para no perder antecedentes repartidos entre ambas fuentes.
- Ignorar respuestas de respaldo que quedaron obsoletas por un cambio de paciente o por una nueva carga.
- Cubrir la precedencia mediante pruebas automatizadas focalizadas y el flujo clinico existente.

**Non-Goals:**

- Modificar el esquema o migrar antecedentes existentes.
- Cambiar la edicion manual de chips o la persistencia al finalizar la consulta.
- Alterar la resolucion de antecedentes al revisar o imprimir consultas existentes.

## Decisions

0. **Usar cronologia clinica y no orden de importacion.** La copia local del caso reportado confirma que `-created` selecciona una atencion del 15/05 mientras la ultima por `fecha` es del 30/06. La precarga usara `-fecha,-created`, inverso del orden `fecha,created` del historial. La verificacion local debe incluir dos consultas cuyo orden de creacion sea inverso a su fecha clinica y ejecutarse sobre el renderer empaquetado con datos sinteticos sin escrituras a PocketBase.

1. **Separar la decision de precarga en una funcion pura.** La normalizacion desde paciente y la determinacion de si se necesita respaldo se centralizaran en `lib/clinical-antecedents.ts`. Esto permite probar el contrato sin depender de tiempos reales de React o PocketBase. Se descarta mantener dos implementaciones locales porque facilita divergencias entre pantallas.

2. **Basar el efecto en la ficha seleccionada confirmada y combinar fuentes.** El efecto no pedira la ultima consulta mientras `selectedPacienteData` sea nulo o pertenezca a otro identificador. Aplicara primero la ficha y luego combinara la ultima consulta disponible mediante union booleana de chips. Para `ant_otra`, un valor historico no vacio tiene prioridad y la ficha queda como respaldo. Se descarta inferir ausencia a partir de la lista de busqueda porque esa lista puede estar todavia cargando.

3. **Cancelar logicamente resultados obsoletos.** Cada ejecucion asincronica tendra una marca de descarte en su limpieza; solo la ejecucion vigente podra actualizar el formulario. Esto evita que una respuesta para un paciente anterior afecte al actual sin requerir cambios en PocketBase.

4. **Mantener la consulta historica como fuente complementaria.** La ultima consulta se consulta aunque la ficha tenga algun antecedente, porque ambas fuentes pueden contener datos distintos. No se introduce una escritura automatica sobre `pacientes`.

## Risks / Trade-offs

- [La ficha seleccionada tarda en cargar] → los chips permanecen vacios durante la carga, pero no se lanza un respaldo incorrecto; el indicador existente informa la espera.
- [El paciente cambia mientras responde PocketBase] → la limpieza del efecto invalida la respuesta anterior antes de modificar el formulario.
- [Los antecedentes estan repartidos entre ficha y consulta anterior] → se aplica la union de chips y no se pierde ninguna marca activa.
- [La prueba E2E no reproduce siempre el orden de respuestas] → una prueba unitaria valida la decision determinista y el E2E verifica la presentacion final del flujo desde ficha.

## Migration Plan

No hay migracion. El cambio se publica con la aplicacion web y se incorpora al siguiente paquete de escritorio. El rollback consiste en revertir la logica cliente y no afecta datos persistidos.

## Open Questions

Ninguna.
