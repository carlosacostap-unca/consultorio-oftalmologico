## Context

La instancia actual de PocketBase ya contiene datos de pacientes, consultas y mutuales cargados previamente. El cliente entrego una exportacion actualizada del sistema anterior en DBF de FoxPro:

- `data/MUTUALES.DBF`: 141 mutuales.
- `data/PACIENTE.DBF`: 62.285 registros, con 62.231 activos y 54 marcados como borrados.
- `data/DATOMED.DBF`: 192.596 consultas.

La base actual contiene mas registros que el origen DBF en pacientes y consultas, por lo que el objetivo no es sumar datos sino reemplazar de manera controlada el universo legacy aprobado. La exploracion inicial detecto fichas duplicadas, consultas sin paciente, codigos de mutual no identificables y diagnosticos guardados en la tabla de pacientes.

## Goals / Non-Goals

**Goals:**

- Leer DBF directamente con decodificacion CP850 y sin depender de CSV parciales.
- Ejecutar un diagnostico `dry-run` antes de cualquier escritura.
- Generar reportes reproducibles con conteos y excepciones.
- Reemplazar mutuales, pacientes y consultas legacy solo despues de backup y confirmacion explicita.
- Importar automaticamente solo relaciones seguras entre consulta y paciente.
- Preservar datos clinicos legacy sin mezclarlos con campos administrativos.
- Mantener `medico_id` vacio en historicos DBF salvo regla explicita del cliente.

**Non-Goals:**

- No modificar pantallas de carga clinica en este alcance.
- No resolver manualmente todas las fichas ambiguas dentro del importador.
- No inferir medico responsable de consultas historicas.
- No crear una restriccion unica nueva en PocketBase para `numero_ficha`.
- No migrar turnos ni recetas desde DBF porque los archivos entregados cubren mutuales, pacientes y consultas.

## Decisions

### Leer DBF directo en scripts propios

Se usara un lector DBF local basado en `fs` e `iconv-lite`, siguiendo el patron ya usado por `scripts/migrar_ocupaciones_pacientes_desde_dbf.mjs`.

Alternativa considerada: convertir DBF a CSV y reutilizar scripts viejos. Se descarta porque los scripts actuales apuntan a CSV parciales, no cubren reemplazo, no generan reportes suficientes y pueden perder encoding o estructura original.

### Separar diagnostico de aplicacion

El flujo tendra un script de diagnostico sin escritura y un modo `--apply` separado para aplicar cambios. El `dry-run` debera producir reportes en `data/reports/` o una carpeta equivalente dentro del repo ignorada si corresponde.

Alternativa considerada: ejecutar importacion directa con logs de consola. Se descarta porque el volumen de registros y las excepciones clinicas requieren revision previa.

### Clasificar fichas duplicadas antes de relacionar consultas

El diagnostico clasificara duplicados por `NUM_FICH`:

- duplicado exacto o consolidable: coincide la identidad basica del paciente, por ejemplo apellido, nombre, documento y fecha de nacimiento normalizados;
- duplicado ambiguo: la misma ficha aparece para identidades distintas o datos incompatibles.

Las consultas de fichas consolidables podran asociarse al paciente consolidado. Las consultas de fichas ambiguas no se asociaran automaticamente a un `paciente_id`; quedaran como excepcion o se importaran con `numero_ficha` segun la decision final de aplicacion.

Alternativa considerada: elegir el primer paciente por ficha. Se descarta porque puede asignar historia clinica a una persona equivocada.

### Consultas huerfanas conservadas como excepcion

Cuando `DATOMED.DBF.NUM_FICH` no exista en `PACIENTE.DBF`, el importador no debe descartar el registro sin evidencia. El diagnostico reportara esas consultas con ficha, cantidad, primera fecha y ultima fecha.

Si se decide importarlas, se crearan sin `paciente_id` y con `numero_ficha`, siempre que la coleccion `consultas` lo tolere. Si la UI no muestra bien consultas sin paciente, esa mejora quedara fuera de este alcance y las huerfanas podran quedar en reporte para resolucion manual.

### Mutual por codigo, sin inventar coincidencias

`PACIENTE.DBF.COD_MUTU` se cruzara contra `MUTUALES.DBF.COD_MUT`. Los codigos `0`, `***` y otros no encontrados no se mapearan por aproximacion.

Para mantener datos operativos se podran crear mutuales administrativas:

- `SIN COBERTURA / SIN MUTUAL INFORMADA`
- `MUTUAL LEGACY SIN IDENTIFICAR`

Alternativa considerada: asignar esos casos a `PARTICULAR`. Se descarta porque algunos tienen numero de afiliado y no necesariamente representan atencion particular.

### Diagnostico de paciente como consulta historica

`PACIENTE.DBF.DIAGNO` y `PRESUNTIVO` son datos clinicos guardados en la tabla de pacientes. No se cargaran en `ant_otra`. Se conservaran como una consulta historica reconocible, con `diagnostico` desde `DIAGNO`, fecha desde `PRESUNTIVO` cuando exista y motivo como `Registro legacy de paciente`.

Alternativa considerada: ignorar `DIAGNO`. Se descarta porque hay mas de 20.000 pacientes con ese dato y puede contener informacion clinica relevante.

### Reemplazo con backup y guardas

El modo destructivo requerira:

- autenticacion administrativa;
- confirmacion explicita por flag;
- backup previo de PocketBase o exportacion JSON de las colecciones afectadas;
- respaldo y limpieza ordenada de dependencias que referencian pacientes o consultas, como eventos de consulta, recetas, eventos de turno y turnos;
- conteos antes y despues;
- reporte final de registros importados, omitidos y excepciones.

## Risks / Trade-offs

- [Riesgo] Fichas reutilizadas pueden mezclar historias clinicas. -> Mitigacion: no asociar automaticamente consultas de fichas ambiguas.
- [Riesgo] La app podria no tener buenas vistas para consultas sin paciente. -> Mitigacion: reportarlas y decidir si se importan sin `paciente_id` o quedan para resolucion manual.
- [Riesgo] El reemplazo borra datos actuales que no esten en DBF o que dependan de pacientes/consultas anteriores. -> Mitigacion: backup obligatorio de colecciones principales y dependientes, conteos previos y confirmacion explicita.
- [Riesgo] Codigos de mutual incompletos pueden ocultar cobertura real. -> Mitigacion: mutuales administrativas y reporte de codigos no encontrados.
- [Riesgo] Importar casi 200.000 consultas puede tardar o fallar a mitad de proceso. -> Mitigacion: carga por lotes, reintentos controlados, progreso persistente o reportes parciales.

## Migration Plan

1. Implementar diagnostico DBF `dry-run` y generar reportes.
2. Revisar reportes con el usuario/cliente y confirmar reglas finales para fichas ambiguas, huerfanas y mutuales raras.
3. Implementar importador con `--apply`, backup y guardas.
4. Probar contra PocketBase de testing o una copia aislada.
5. Validar conteos y muestras clinicas en la app.
6. Ejecutar en produccion solo con backup reciente y aprobacion explicita.
7. Conservar reportes finales junto con fecha/hora de migracion.

## Open Questions

- Las consultas huerfanas, especialmente ficha `20163` con 44 consultas, se importaran sin paciente o quedaran solo en reporte?
- El cliente quiere crear una mutual administrativa unica para `0` y `***`, o separar `SIN COBERTURA` de `LEGACY SIN IDENTIFICAR`?
- Los registros `DIAGNO` de `PACIENTE.DBF` deben importarse siempre como consulta historica adicional o solo cuando el paciente no tenga consultas en `DATOMED.DBF`?
- Se hara una prueba completa en PocketBase de testing antes del reemplazo real?
