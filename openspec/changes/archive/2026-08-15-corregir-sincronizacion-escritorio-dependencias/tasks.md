## 1. Pull incremental ordenado

- [x] 1.1 Extraer y probar la planificación de entidades y la clasificación de errores de conectividad
- [x] 1.2 Descargar y agotar pacientes, consultas y recetas secuencialmente, avanzando cada cursor sólo tras persistir la página

## 2. Estado visible y recuperable

- [x] 2.1 Eliminar el orden local inválido de conflictos y garantizar que `/sincronizacion` abandone el estado de carga ante errores
- [x] 2.2 Mantener conectividad online para errores funcionales y mostrar el error de sincronización sanitizado

## 3. Verificación

- [x] 3.1 Ejecutar pruebas focalizadas y completas, lint, TypeScript, build Next.js y validación OpenSpec estricta
