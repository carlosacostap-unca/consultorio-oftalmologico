## Context

El cliente de escritorio solicita páginas de 100 registros y `processPullEntities` aborta una colección después de 100 páginas. Cada página aplicada guarda su cursor, pero el agotamiento de ese presupuesto se convierte en una excepción y la sincronización completa nunca registra éxito. En staging existen 63.936 pacientes y 207.604 consultas, por lo que una descarga histórica legítima supera ampliamente 10.000 registros.

La solución debe preservar el orden de dependencias `pacientes -> consultas -> recetas`, la aplicación idempotente por ID y la regla de avanzar el cursor sólo después de persistir toda la página. También debe evitar ejecuciones ilimitadas que mantengan ocupada la interfaz o escondan una respuesta central defectuosa.

## Goals / Non-Goals

**Goals:**

- Completar automáticamente descargas iniciales o incrementales de cualquier volumen razonable mediante tramos reanudables.
- Conservar el avance confirmado frente a límites de trabajo, cierres, reinicios y cortes de red.
- Distinguir un tramo incompleto normal de un error real de red, autenticación, persistencia o cursor.
- Mantener visible que la copia local todavía se está actualizando y registrar éxito sólo al alcanzar al servidor central.
- Detectar páginas que no hacen avanzar el cursor antes de entrar en un ciclo infinito.
- Validar el comportamiento con pruebas que excedan el límite actual sin incluir contenido clínico real.

**Non-Goals:**

- Descargar toda la historia en una única solicitud HTTP o en una ejecución sin límites.
- Cambiar la resolución de conflictos, el orden de dependencias o la semántica de bajas lógicas.
- Migrar registros clínicos o agregar campos a PocketBase.
- Calcular un porcentaje exacto basado en el total central, porque ese total puede cambiar durante la descarga y su consulta repetida agrega costo.

## Decisions

### 1. Un presupuesto agotado producirá una continuación, no una excepción

El procesador paginado devolverá un resultado estructurado por colección que indique `complete` o `continuation_required`. Mantendrá un presupuesto acotado de páginas o registros por tramo; si la última página informa `hasMore`, conservará el cursor ya confirmado, publicará que aún hay trabajo y programará otro tramo mediante el ejecutor single-flight.

Se prefiere esta alternativa a elevar o eliminar `maximumPages`: con más de 200.000 consultas, un límite fijo suficientemente alto prolongaría una sola ejecución durante demasiado tiempo y seguiría fallando ante un volumen futuro mayor.

### 2. La unidad durable seguirá siendo una página completamente aplicada

Para cada página, el cliente aplicará todos los upserts y recién después guardará el cursor `(updated, id)`. Una interrupción antes de guardar repetirá esa página de manera idempotente; una interrupción posterior reanudará desde la página siguiente. El cambio reutilizará `sync_cursors` y el JSON de `sync_runtime_state`, sin migración de esquema.

El tamaño solicitado podrá utilizar el máximo aceptado actualmente por el endpoint para reducir viajes de red, pero quedará expresado como constante probada y no como supuesto de completitud.

### 3. La guarda de seguridad verificará avance estricto del cursor

El cliente conservará el cursor enviado en cada solicitud y exigirá que una página con registros o `hasMore` devuelva un cursor estrictamente posterior según el mismo orden estable `(updated, id)`. También rechazará una página sin registros que declare `hasMore`, una entidad distinta o un cursor ausente o repetido.

Esto reemplaza la cantidad total de páginas como detector de ciclos. Se prefiere validar progreso semántico porque una colección grande es legítima, mientras que repetir el mismo cursor sí demuestra que continuar no resolverá el problema.

### 4. El estado persistente separará conectividad, fase y completitud

El estado de sincronización incorporará una fase no clínica, la colección en curso y contadores del tramo, por ejemplo `pulling`, `continuation_required`, `caught_up` o `error`. La interfaz mostrará mensajes como “Descargando consultas” y la cantidad procesada, sin nombres, diagnósticos ni contenido narrativo.

Entre tramos, la copia seguirá marcada como “Sincronizando” aunque no exista una petición activa. `lastSuccessAt` sólo avanzará cuando pacientes, consultas y recetas respondan `hasMore: false`. Un error verdadero conservará el último cursor durable y expondrá una acción recuperable.

### 5. La continuación será automática, single-flight y cancelable por mantenimiento

Al finalizar un tramo con trabajo restante, el cliente programará el siguiente con una espera breve para ceder el hilo. `createSingleFlightRunner` impedirá ejecuciones concurrentes y la preparación para actualizaciones o cierre cancelará nuevas continuaciones después de esperar la ejecución activa.

Se descarta exigir pulsaciones manuales repetidas: además de una experiencia deficiente, dejaría equipos parcialmente actualizados sin una señal confiable de completitud.

## Risks / Trade-offs

- [La primera sincronización puede consumir red y disco durante varios minutos] → Trabajar en tramos acotados, ceder entre ellos y mostrar la colección en curso.
- [El servidor central puede recibir cambios mientras avanza el pull] → Mantener el orden estable `updated,id`; los cambios posteriores quedarán incluidos en el tramo actual o en el siguiente ciclo incremental.
- [Un reinicio entre páginas puede repetir registros] → Conservar upserts idempotentes y guardar el cursor sólo después de completar la página.
- [Un cursor malformado podría omitir o repetir datos] → Validar entidad, presencia y avance estricto antes de persistirlo; ante falla conservar el cursor anterior.
- [Aumentar el tamaño de página eleva el costo de una transacción local] → Mantener el tamaño dentro del máximo central y cubrir fallas a mitad de aplicación con pruebas.
- [Versiones anteriores seguirán mostrando el límite como error] → Publicar primero en el canal piloto y usar el actualizador existente para llevar el equipo a la versión corregida.

## Migration Plan

1. Implementar y validar la máquina de estados reanudable y las guardas de cursor en desarrollo.
2. Probar con más de 10.000 registros sintéticos y con interrupciones en distintos puntos de una página.
3. Desplegar el endpoint compatible en staging; el contrato seguirá aceptando clientes anteriores.
4. Publicar la siguiente versión de escritorio en el canal piloto y verificar que reutiliza el cursor ya guardado en el equipo `PC-E24D57F3`.
5. Confirmar que finaliza el catch-up, actualiza `lastSuccessAt` y no crea pendientes, errores ni conflictos espurios antes de promoverla.

El rollback de la aplicación no requiere revertir datos ni esquema. Los cursores guardados por la versión nueva mantienen el mismo formato, aunque una versión anterior volvería a cortar por presupuesto y no debe considerarse una solución operativa.

## Open Questions

No hay decisiones funcionales bloqueantes. El tamaño de página, el presupuesto por tramo y la espera entre continuaciones se fijarán como constantes internas calibradas con las pruebas de staging, sin cambiar el contrato de usuario.
