## 1. Procesamiento paginado reanudable

- [x] 1.1 Definir el resultado estructurado de un tramo, las constantes de presupuesto y la comparación estricta de cursores `(updated, id)`.
- [x] 1.2 Adaptar `processPullEntities` para devolver completitud o continuación sin convertir un presupuesto agotado en error.
- [x] 1.3 Rechazar entidades incorrectas, páginas vacías con `hasMore` y cursores ausentes, repetidos o no crecientes sin adelantar el cursor durable.
- [x] 1.4 Agregar pruebas unitarias para más de 100 páginas, reanudación desde el cursor guardado, falla durante un upsert y cursor estancado.

## 2. Orquestación y estado de sincronización

- [x] 2.1 Extender el estado persistente con fase, colección en curso y contadores técnicos compatibles con estados locales anteriores.
- [x] 2.2 Hacer que el motor programe continuaciones automáticas single-flight con una espera breve y respete cierre, mantenimiento y actualización de la aplicación.
- [x] 2.3 Registrar `lastSuccessAt` únicamente cuando todas las colecciones estén al día y conservar el último éxito durante los tramos intermedios.
- [x] 2.4 Probar continuaciones consecutivas, pulsaciones manuales concurrentes, reinicio entre tramos y cancelación por mantenimiento.

## 3. Contrato central y experiencia de usuario

- [x] 3.1 Verificar y probar que el endpoint de pull mantiene orden estable, límite acotado y compatibilidad con clientes anteriores.
- [x] 3.2 Leer la documentación local pertinente de Next.js 16 antes de modificar los componentes cliente de sincronización.
- [x] 3.3 Actualizar la pantalla y la barra lateral para mostrar fase, colección y progreso no clínico sin presentar un tramo pendiente como error o copia actualizada.
- [x] 3.4 Agregar pruebas del estado visible durante una descarga extensa, al completar y ante un cursor inválido.

## 4. Verificación y piloto

- [x] 4.1 Ejecutar las pruebas focalizadas de sincronización con un volumen sintético equivalente a más de 200.000 registros paginados.
- [x] 4.2 Ejecutar lint, comprobación de tipos, suite relevante, build de producción y validación OpenSpec estricta.
- [x] 4.3 Desplegar el contrato compatible en staging y verificar que el equipo piloto reanuda su cursor existente hasta quedar al día sin pendientes, errores ni conflictos espurios.
- [x] 4.4 Preparar la versión de escritorio `0.1.7` para el canal piloto y comprobar la actualización in-place, manteniendo estable sin cambios hasta aprobar el piloto.
