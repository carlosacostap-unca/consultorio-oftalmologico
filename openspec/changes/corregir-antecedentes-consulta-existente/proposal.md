## Why

Al revisar una consulta existente, los antecedentes fijos del paciente pueden mostrarse brevemente como activos y luego desmarcarse, aunque continúen registrados en su ficha. Esto genera una señal clínica ambigua y puede llevar al médico a interpretar que el paciente no tiene una enfermedad de base informada.

## What Changes

- Mantener visibles y estables los antecedentes fijos registrados en la ficha del paciente al abrir una consulta existente.
- Definir una precedencia explícita entre los antecedentes propios de la consulta y los vigentes en la ficha del paciente.
- Evitar que cargas asíncronas posteriores sobrescriban el estado clínico ya hidratado con valores vacíos o desactualizados.
- Incorporar una prueba de regresión para un paciente con diabetes registrada.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `clinical-consultations`: la revisión de una consulta existente debe presentar de forma estable los antecedentes fijos registrados para el paciente asociado.

## Impact

- Pantalla de detalle y edición en `app/consultas/[id]/page.tsx`.
- Pruebas del flujo de consultas existentes.
- No requiere cambios de esquema de PocketBase, migración de datos ni modificaciones a scripts de importación.
