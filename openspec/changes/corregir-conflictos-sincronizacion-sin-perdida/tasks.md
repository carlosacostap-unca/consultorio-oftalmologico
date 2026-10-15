## 1. Compatibilidad y recuperación durable

- [x] 1.1 Escribir creación y resolución de conflictos en ambos esquemas, conservando snapshots y campos heredados.
- [x] 1.2 Reutilizar conflictos por operación/equipo/actor tras una interrupción de la confirmación.

## 2. Protección local

- [x] 2.1 Proteger registros con otras operaciones sin confirmar ante confirmaciones y pull, conservando cursores y payloads.
- [x] 2.2 Persistir evidencia local antes de cambiar la operación a conflicto.

## 3. Verificación y preparación operativa

- [x] 3.1 Probar el rechazo original y la solución con PocketBase aislado, sin datos clínicos reales.
- [x] 3.2 Probar respuestas perdidas, conflictos repetidos y protección de ediciones pendientes con comparación de contenido.
- [x] 3.3 Ejecutar las pruebas de sincronización, análisis estático, compilación y validación OpenSpec.
- [x] 3.4 Documentar comprobación de respaldo, compatibilidad y conciliación sin borrar datos.
- [x] 3.5 Probar el recorrido completo entre dos bases aisladas y evitar conflictos falsos tras interrumpirse la confirmación de una edición o baja ya aplicada; incorporar estos ensayos al workflow de publicación.
- [x] 3.6 Preparar piloto 0.1.17-pilot.1 desde la versión publicada, verificar sus pruebas, empaquetar NSIS, inspeccionar contenido y ejecutar arranque con perfil vacío aislado; conservar instalador y evidencia local sin publicar canales.
- [x] 3.7 Corregir los avisos de dependencias que bloquean el empaquetado mediante parches compatibles y repetir la auditoría de producción.
- [x] 3.8 Generar la versión nativa Windows 0.1.17 solicitada para el oftalmólogo conservando el código probado, verificar paquete/arranque/hashes y preparar también la revisión del backend central autorizada, sin cambios de interfaz web.

- [x] 3.9 Permitir la distribución automática solicitada: cabecera de versión del runtime, bloqueo de sincronización antigua y pruebas de preservación y acceso al actualizador.

## 4. Recuperación del equipo afectado

- [ ] 4.1 Renovar y verificar el respaldo central; registrar el respaldo manual confirmado por el usuario y verificar el mecanismo automático de respaldo de 0.1.16 antes de instalar.
- [ ] 4.2 Desplegar servidor con guarda de compatibilidad y distribuir 0.1.17 firmada mediante los canales pilot y stable, conservando el esquema y verificando el acceso del equipo al actualizador.
- [ ] 4.3 Conciliar las 12 operaciones originales contra confirmaciones/conflictos y comprobar contenido y relaciones.
