# Verificación

- `node --test desktop/typography.test.mjs`: 3 pruebas aprobadas; signos, modificadores, límites, restauración, persistencia, corrupción y error de disco.
- Suite `test:sync-core`: 174 pruebas aprobadas, incluida tipografía.
- Next.js 16.3.5: compilación de producción y TypeScript aprobados. Se requirió acceso de red para descargar las fuentes existentes de Google.
- ESLint sin errores ni advertencias sobre el código del proyecto, excluyendo `.tmp`, `output`, `.codex-remote-attachments` y `entregables`. La ejecución sin exclusiones detectó 18 errores en scripts temporales de verificación de las versiones previas 0.1.12 y 0.1.13.
- OpenSpec: validación estricta aprobada.
- Electron 43.1.0 real, ventana oculta con perfil aislado y preload real contra el build local: Ctrl+Shift+«+», Ctrl+=, Ctrl+«−», teclado numérico y Ctrl+0 aprobados con foco en un campo. Zoom nativo conservado en 1.
- Los 13 tamaños tipográficos aumentaron proporcionalmente. Texto base: 14 px inicial, 15,4 px al 110%, 28 px al 200%. Tamaño raíz de 16 px conservado.
- Emulación de impresión: texto base de 16 px y escala tipográfica original. Ventana web sin bridge: mismos tamaños originales.
- Preferencia de 150% recuperada al recargar y destruir/recrear la ventana; lectura durable comprobada desde `typography.json`. Sin acceso a perfiles o bases reales de usuarios.
- Captura al 200% inspeccionada en la pantalla de activación: formulario y botón legibles. No se ejecutaron flujos clínicos autenticados ni impresión física.
- Evidencia local: `output/playwright/desktop-fonts-verification.json` y `output/playwright/desktop-fonts-200.png`.

Referencia técnica: [Electron webContents](https://www.electronjs.org/docs/latest/api/web-contents), eventos `before-input-event` e IPC limitado a la ventana.

## Distribución

El usuario autorizó publicar la actualización. Se prepara la versión 0.1.14 mediante el flujo firmado existente; su promoción a stable conserva la protección de revisión configurada en GitHub.
