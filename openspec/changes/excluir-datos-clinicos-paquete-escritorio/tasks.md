## 1. Limite del paquete

- [x] 1.1 Excluir `data/**/*` y manifiestos `*.nft.json` de la copia del standalone hacia `resources/app`.
- [x] 1.2 Implementar una politica reutilizable que detecte rutas de datos clinicos, trazas de construccion y bases activas dentro de la salida empaquetada y `app.asar`.

## 2. Barrera automatizada

- [x] 2.1 Agregar pruebas unitarias para una salida permitida y para variantes prohibidas de `data`, `pb_data`, `*.nft.json` y bases activas.
- [x] 2.2 Integrar la verificacion como `afterPack` y posteriormente a electron-builder en `desktop:pack` y `desktop:dist`.

## 3. Verificacion del artefacto

- [x] 3.1 Ejecutar pruebas focalizadas, lint, build y validacion OpenSpec.
- [x] 3.2 Reconstruir `win-unpacked`, confirmar que no contiene `resources/app/data`, trazas ni datos activos y comprobar que el runtime inicia.
