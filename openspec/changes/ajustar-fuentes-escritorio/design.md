## Context

El escritorio usa fuentes compactas mediante variables CSS bajo `data-desktop`. Electron incluye atajos de zoom propios. El servidor local cambia de puerto al iniciar, por lo que localStorage no garantiza persistencia entre sesiones.

## Goals / Non-Goals

**Goals:** Cambiar toda la tipografía con atajos, conservar proporciones y recordar la preferencia sin conexión.

**Non-Goals:** Zoom de imágenes, cambios de espaciado global, configuración por cuenta clínica, impresión/exportación o modificaciones de datos.

## Decisions

- Interceptar `before-input-event` en la ventana principal de Windows, antes del zoom nativo. Reconocer los signos por tecla y el teclado numérico por código; aceptar Ctrl+= como alternativa habitual y excluir Alt/AltGr, Meta, composición y keyUp.
- Guardar un porcentaje entero validado de 80 a 200 en `userData/typography.json`, independiente del origen web. Escritura atómica de un archivo pequeño y recuperación al valor 100 ante contenido inválido. Un fallo de disco no bloquea la sesión.
- Exponer solamente lectura y suscripción de escala mediante IPC acotado a la ventana. No conceder acceso al filesystem al renderer. El proveedor global aplica una variable CSS y limpia su suscripción.
- Multiplicar las variables tipográficas existentes y las clases de 10/11 px dentro de `@media screen`, manteniendo el tamaño inicial, los rem de espaciado y la impresión.
- Mantener compatibilidad del proveedor con bridges previos que no tengan la API de tipografía.

## Risks / Trade-offs

- Fuentes grandes requieren más espacio: comprobar formulario y navegación con escala máxima.
- Atajos nativos podrían duplicar el efecto: verificar en Electron real que su zoom siga en 1.
- Errores de persistencia: registrar diagnóstico técnico y mantener el ajuste de la sesión.
