## Why

El medico necesita ver la ocupacion del paciente junto con los datos administrativos basicos durante la atencion, sin buscarla en otra pantalla. Este dato tambien debe poder cargarse y mantenerse desde la ficha normal del paciente.

## What Changes

- Agregar el campo opcional `ocupacion` al paciente.
- Permitir cargar y editar la ocupacion desde alta y edicion de pacientes.
- Mostrar la ocupacion en la misma fila de datos iniciales del paciente dentro de `/consultas/nueva`.
- Mostrar la ocupacion al visualizar una consulta existente.
- Preparar el esquema de PocketBase para crear `pacientes.ocupacion` de forma repetible.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `patient-management`: la ficha del paciente incorpora ocupacion como dato administrativo/personal.
- `clinical-consultations`: la carga de nueva consulta muestra ocupacion junto con edad, obra social y domicilio.

## Impact

- Afecta `pacientes` en PocketBase con un campo de texto opcional.
- Afecta tipos compartidos de paciente, pantallas de alta/edicion y nueva consulta.
- Afecta scripts de bootstrap/esquema para ambientes de prueba y produccion.
