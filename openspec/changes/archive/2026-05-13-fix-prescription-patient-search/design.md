## Overview

El problema no esta en permisos ni autenticacion, sino en la composicion del filtro enviado a PocketBase. Si el filtro referencia una columna que no existe en la coleccion, PocketBase rechaza toda la consulta con 400.

## Decisions

- Agregar un helper compartido para construir filtros de busqueda activa de pacientes.
- No incluir `dni` en filtros remotos porque no es parte garantizada del esquema actual.
- Mantener `patientDocument()` con fallback a `dni` para mostrar registros antiguos o expandidos que todavia lo tengan.
- Usar textos ASCII en recetas para evitar nuevos problemas de encoding.

## Validation

- Reproducir el filtro contra PocketBase test.
- Ejecutar build de Next.js.
- Ejecutar Playwright contra PocketBase test.
- Validar OpenSpec.
