# Verificacion del 27/09/2026

La inspeccion de solo lectura de la ficha local reportada confirmo que ordenar por `created` seleccionaba una consulta del 15/05/2026 sin Maculopatia ni Otra; ordenar por `fecha,created` seleccionaba la atencion del 30/06/2026 con Maculopatia y UVEITIS. El historial visible ya usaba fecha clinica, pero la precarga no.

Se cambio la precarga a `-fecha,-created`. Se conserva la combinacion con la ficha del paciente, necesaria para Diabetes en este caso.

`node scripts/verify_desktop_antecedents.mjs` abre el renderer real de `dist-desktop/win-unpacked/resources/app` con Chromium en un perfil temporal y respuestas API sinteticas. Las dos consultas de prueba tienen ordenes clinico y de importacion opuestos. El recorrido abre la ultima consulta, pulsa el enlace Nueva consulta y exige los dos chips activos y Otra=UVEITIS. Todas las API se interceptan, se rechazan escrituras y conexiones externas. No se guardan consultas.

- Paquete anterior: regresion reproducida; nueva consulta solicito `-created` y la asercion UVEITIS fallo.
- Paquete corregido: recorrido aprobado con Diabetes, Maculopatia y UVEITIS.
- Captura sintetica: `output/playwright/antecedentes-cronologia.png`.
- Pruebas unitarias de antecedentes: 7/7.
- ESLint focalizado y build Next.js (incluye TypeScript): aprobados.
- Reconstruccion Windows: aprobada; inspector afterPack aprobo 13.827 entradas.
- E2E remoto de staging: no reejecutado; la verificacion de esta entrega es el recorrido local sobre el renderer empaquetado.

Esta verificacion cubre la pantalla y la seleccion temporal. La sesion de un usuario real en Electron no fue automatizada en esta iteracion. No se publico una version.

El usuario confirmó posteriormente que la aplicación reconstruida funciona correctamente. Se prepara la versión 0.1.16; su flujo de publicación ejecutará además la regresión sintética sobre el paquete generado antes de publicar el canal pilot.
