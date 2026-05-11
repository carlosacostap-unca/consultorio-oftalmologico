## Why

La secretaria necesita otorgar turnos para varios medicos con rapidez y bajo margen de error. Hoy la app ya distingue medicos y roles, pero el alta de turno todavia funciona como un formulario general; conviene convertirlo en un flujo guiado por medico, fecha, disponibilidad y paciente.

## What Changes

- Redisenar el flujo de otorgamiento de turnos para que la secretaria primero elija medico y fecha, luego vea bloques y horarios disponibles.
- Mostrar claramente horarios libres, turnos ya otorgados y opciones de sobreturno dentro del contexto del medico seleccionado.
- Mejorar la busqueda/seleccion de paciente y mantener la posibilidad de alta rapida de paciente desde el flujo.
- Prevenir errores comunes: crear turnos sin medico, fuera de disponibilidad, superpuestos sin marcar sobreturno o con datos incompletos.
- Mantener comportamiento especifico por rol activo: secretaria gestiona todas las agendas; medico trabaja sobre su propia agenda.
- Dejar pruebas automatizadas con Playwright para login por rol y flujo de otorgamiento de turno.

## Capabilities

### New Capabilities

- `secretary-appointment-assignment`: cubre la experiencia guiada para que secretaria otorgue turnos por medico, fecha, disponibilidad, horario y paciente.

### Modified Capabilities

- `appointment-scheduling`: cambia requisitos del alta de turnos, validaciones de disponibilidad y representacion de horarios libres/ocupados.
- `access-and-navigation`: ajusta comportamiento esperado cuando se cambia el rol activo durante el flujo de turnos.

## Impact

- Pantallas `app/turnos/page.tsx`, `app/turnos/nuevo/page.tsx` y posiblemente componentes compartidos del flujo de turnos.
- API/consultas PocketBase de `users`, `disponibilidades`, `turnos` y `pacientes`.
- Scripts de datos demo para contar con pacientes, disponibilidades y turnos reproducibles.
- Pruebas automatizadas con Playwright sobre `localhost:3000`.
