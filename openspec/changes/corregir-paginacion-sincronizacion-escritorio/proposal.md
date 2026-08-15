## Why

La sincronización de escritorio corta cada colección después de 100 páginas y presenta ese corte como error, aunque el cursor durable haya avanzado correctamente. Staging contiene 207.604 consultas, por lo que una copia inicial o una recuperación amplia no puede terminar en una sola ejecución y deja al usuario frente a un estado incompleto y confuso.

## What Changes

- Procesar las descargas extensas en tramos reanudables que conserven el cursor confirmado y continúen automáticamente hasta alcanzar al servidor central.
- Tratar el agotamiento del presupuesto de un tramo como progreso pendiente, no como error de sincronización.
- Mantener una guarda de seguridad que detenga la descarga cuando el cursor no avance o la respuesta sea inconsistente.
- Mostrar en la pantalla y la navegación que la descarga inicial o incremental continúa, incluyendo la colección en curso y el progreso técnico no clínico disponible.
- Permitir cierres, reinicios y cortes de red sin perder el avance confirmado ni presentar la copia parcial como totalmente sincronizada.
- Incorporar pruebas automatizadas con volúmenes superiores al límite actual y con cursores estancados.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `offline-data-synchronization`: la descarga incremental paginada pasa a ser reanudable para colecciones grandes, distingue progreso pendiente de errores reales y expone un estado de avance seguro.

## Impact

- Motor cliente de sincronización de escritorio, persistencia de cursores y estado de ejecución.
- Endpoint central de pull, contrato de respuesta y validación de avance del cursor.
- Pantalla y resumen lateral de sincronización de escritorio.
- Pruebas unitarias y de integración del flujo paginado.
- No requiere migrar registros clínicos ni cambiar el esquema de PocketBase; los cursores durables existentes se reutilizan.
