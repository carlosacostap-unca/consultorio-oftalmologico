## Context

La pagina `/consultas/nueva` ya resuelve carga desde paciente y turno, copia antecedentes y guarda la consulta vinculando el turno. El problema principal es ergonomico: la pantalla concentra demasiada informacion sin jerarquia y obliga al medico a leer una planilla larga durante la atencion.

El cambio debe preservar campos, nombres de propiedades y persistencia PocketBase. La mejora se concentra en composicion visual, resumen de contexto y pequenas ayudas de orientacion.

## Goals / Non-Goals

**Goals:**

- Hacer visible el paciente y el contexto del turno al inicio de la consulta.
- Separar la carga clinica en bloques escaneables.
- Mantener la carga rapida de antecedentes, AV, PIO, refraccion, biomicroscopia, fondo de ojo, diagnostico y tratamiento.
- Conservar el guardado actual y la actualizacion del turno a `Atendido`.
- Validar con Playwright el flujo medico desde turno.

**Non-Goals:**

- Cambiar el modelo de datos de `consultas`.
- Redisenar la edicion de consultas existentes.
- Agregar prescripciones o impresion dentro de este primer bloque.
- Cambiar reglas de permisos.

## Decisions

- Mantener un solo componente cliente para evitar mover logica de formulario y busqueda en esta etapa.
- Agregar helpers de presentacion para resumen de paciente, antecedentes activos y secciones clinicas.
- Usar layout con panel principal y lateral en desktop, apilado en mobile, sin cards anidadas.
- Reutilizar los campos actuales para no afectar importaciones, reportes ni impresiones.
- Mantener `useSearchParams` dentro de `Suspense`, acorde a la documentacion local de Next.js.

## Risks / Trade-offs

- Formulario grande dentro de un solo archivo -> Mitigacion: cambios acotados y helpers pequenos, dejando refactor a componentes para una etapa posterior.
- Textos existentes con encoding heredado -> Mitigacion: no tocar mas textos de los necesarios y usar nuevos textos ASCII cuando sea razonable.
- Cambio visual puede afectar selectores Playwright -> Mitigacion: validar la suite completa y ajustar locators por rol/texto estable.
