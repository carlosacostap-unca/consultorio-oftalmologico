## Why

Una mutual creada después de la activación no llega a Windows y bloquea la descarga de pacientes que la referencian. Además, una resolución clínica aprobada en el servidor debe poder recuperarse tras una interrupción sin usar las versiones antiguas del conflicto.

## What Changes

- Actualizar mutuales antes de sincronizar datos clínicos, sin eliminar filas ni vaciar relaciones.
- Recuperar resoluciones ya confirmadas en el servidor, verificando identidad de operación, equipo y actor; conservar conflictos que todavía necesitan decisión.
- Guardar primero el registro local y confirmar después su operación, conservando snapshots y payloads y protegiendo otras ediciones pendientes.
- Publicar Windows 0.1.18 después de pruebas aisladas, respaldo central verificado y despliegue del servidor.

## Capabilities

### New Capabilities
- `desktop-sync-recovery`: Actualización de catálogos y recuperación durable de resoluciones autorizadas.

### Modified Capabilities

Ninguna: se mantienen las garantías de sincronización y revisión clínica existentes.

## Impact

Motor Windows, API de conflictos y pruebas reales con dos PocketBase ficticios. Sin migración de esquema, importación, borrado ni restauración de bases. La conciliación puntual conserva las versiones originales y sólo cambia metadatos de la resolución ya autorizada.
