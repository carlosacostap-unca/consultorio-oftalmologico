## 1. Resolución de configuración central

- [x] 1.1 Implementar y probar la resolución validada de la URL central con precedencia de entorno y fallback a la activación cifrada.
- [x] 1.2 Integrar la resolución en las búsquedas manuales y automáticas, diferenciando configuración ausente, autenticación requerida y errores de consulta.
- [x] 1.3 Registrar de forma sanitizada el inicio y resultado de cada búsqueda sin exponer secretos ni parámetros sensibles.

## 2. Respuesta visible en escritorio

- [x] 2.1 Mostrar mensajes accionables para configuración ausente, sesión requerida, versión vigente y fallo de búsqueda.
- [x] 2.2 Agregar pruebas de presentación para los nuevos estados y conservar descarga, posposición e instalación existentes.

## 3. Preparación y verificación del release

- [x] 3.1 Actualizar la versión del paquete y lockfile a `0.1.6` sin modificar dependencias.
- [x] 3.2 Ejecutar pruebas focalizadas y completas, lint, TypeScript, build y validación OpenSpec estricta.
- [x] 3.3 Verificar el empaquetado NSIS x64 y documentar la comprobación manual pendiente en el equipo piloto.

> Evidencia local: `0.1.6`, 117/117 pruebas, lint, TypeScript, build, 53/53 validaciones OpenSpec y NSIS x64 de 176438847 bytes correctos. Queda pendiente publicar el release en `pilot` y comprobar búsqueda, descarga, posposición, respaldo, reinicio y salud posterior en el equipo activado.
