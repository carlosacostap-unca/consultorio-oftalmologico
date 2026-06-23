## Overview

El fallo observado aparece cuando el formulario de nueva consulta envia campos clinicos que forman parte del flujo medico, pero el esquema real de PocketBase no los acepta. La solucion debe corregir el contrato de datos, no eliminar campos del payload, porque ADD y biomicroscopia ya son parte del comportamiento clinico aceptado.

## Decisions

- Agregar un script idempotente `ensure_consulta_clinical_fields.mjs` que asegure `consultas.add_value` y `consultas.biomicroscopia` como campos `text`.
- Incluir el script en `schema:test` para que el entorno de prueba detecte futuras divergencias de esquema.
- Mejorar el error de `POST /api/consultas` para propagar mensajes seguros y utiles cuando PocketBase responde con validaciones de esquema.
- Mantener la conversion de fecha y la atribucion medica existentes sin ampliar el alcance.

## Validation

- Validar OpenSpec del cambio.
- Ejecutar build de Next.js.
- Ejecutar el script de esquema contra el entorno configurado en `.env.local` para aplicar la correccion en produccion.
- Verificar luego que la coleccion `consultas` tenga ambos campos.
