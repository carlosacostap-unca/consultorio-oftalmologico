## Context

Next.js genera `.next/standalone` mediante trazado de archivos. La ruta administrativa de fichas duplicadas referencia `data/DATOMED.DBF`, por lo que el trazado incorpora el directorio local `data/` completo y un manifiesto `.nft.json` enumera nombres y hashes derivados de esos archivos. `electron-builder` copia luego todo el standalone, excepto `node_modules`, hacia `resources/app`; en la reproduccion local esto produjo 22 archivos y 95.878.689 bytes de datos ignorados por Git dentro del paquete, ademas del metadato de trazado.

El runtime de escritorio guarda su base real bajo `app.getPath("userData")` y provee PocketBase como `resources/pocketbase` con ejecutable, migraciones y hooks. No necesita `resources/app/data` ni una base `pb_data` preconstruida. El servidor central, en cambio, puede seguir usando la fuente DBF en su propio entorno para tareas administrativas.

## Goals / Non-Goals

**Goals:**

- Impedir que el directorio local ignorado `data/` llegue a cualquier paquete o instalador de escritorio.
- Fallar el empaquetado si reaparece `resources/app/data`, un manifiesto `*.nft.json` o una base activa `pb_data` dentro del artefacto.
- Mantener todos los recursos necesarios para iniciar Next.js y PocketBase local.
- Conservar sin cambios el build standalone central y las herramientas de importacion ejecutadas fuera del escritorio.

**Non-Goals:**

- Eliminar, mover o modificar los archivos locales existentes bajo `data/`.
- Rediseñar la herramienta administrativa de fichas duplicadas o sus fuentes DBF.
- Publicar un release, modificar canales `pilot`/`stable` o cambiar la version durante esta correccion.

## Decisions

1. **Aplicar la exclusion en el limite de electron-builder.** El filtro de `extraResources` para `.next/standalone` agregara `!data/**/*`, `!**/*.nft.json` y `!.next/node_modules/**/*`. Este es el limite especifico del artefacto de escritorio y no altera el standalone usado por despliegues centrales. Se descarta excluir el archivo desde `next.config.ts` porque rompería la ruta administrativa en todos los destinos. Los manifiestos de trazado y los junctions auxiliares de `.next/node_modules` son insumos de construccion; las dependencias operativas ya se copian desde el `node_modules` raiz del standalone.

2. **Verificar la salida real, no solo la configuracion.** Un helper recorrera `dist-desktop/win-unpacked/resources`, `app.asar.unpacked` y las entradas logicas de `app.asar`; rechazara `app/data`, cualquier `pb_data` empaquetado, trazas `*.nft.json` y archivos de base activa en ubicaciones equivalentes. Un hook `afterPack` cubrira incluso invocaciones directas de electron-builder y los scripts de paquete e instalador repetiran el control al finalizar. Una prueba unitaria cubrira una salida legitima y variantes prohibidas.

3. **Permitir el runtime PocketBase minimo.** `resources/pocketbase/pocketbase.exe`, `pb_migrations` y `pb_hooks` continuaran permitidos. La base creada en el perfil del usuario queda fuera del directorio reemplazable y no forma parte del artefacto.

4. **No borrar el paquete inseguro como parte del fix.** El directorio generado es ignorado y local; se reemplazara al volver a empaquetar. No se publica, firma ni promueve ningun byte de esa salida.

## Risks / Trade-offs

- [Una ruta de escritorio intenta usar `data/DATOMED.DBF`] → fallara solamente esa herramienta de mantenimiento central; el flujo clinico y offline no dependen del DBF. La herramienta no se redefine en este cambio.
- [Otro paso vuelve a copiar datos bajo un nombre distinto] → el verificador revisa rutas sensibles y extensiones de base activa en todo `resources`; futuras ampliaciones pueden extender la politica sin depender del filtro.
- [El control se ejecuta despues de gastar tiempo en empaquetar] → es deliberado para validar los bytes reales; la prueba unitaria ofrece retroalimentacion rapida sobre la politica.

## Migration Plan

Agregar filtro, helper y pruebas; reconstruir `win-unpacked`; demostrar que `resources/app/data` ya no existe y que la aplicacion inicia. Luego generar un instalador con una version superior mediante el flujo normal. El rollback revierte el filtro y el control, sin cambios de datos ni esquema.

## Open Questions

Ninguna.
