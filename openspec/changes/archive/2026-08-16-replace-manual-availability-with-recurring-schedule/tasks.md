## 1. Schema

- [x] 1.1 Crear schema idempotente para `agenda_semanal_medico`.
- [x] 1.2 Crear schema idempotente para `bloqueos_agenda`.
- [x] 1.3 Integrar ambos schemas en `schema:test`.

## 2. Core Scheduling

- [x] 2.1 Crear helpers para generar slots desde reglas semanales.
- [x] 2.2 Crear helpers para aplicar bloqueos por medico y bloqueos generales.
- [x] 2.3 Crear helpers para detectar turnos en conflicto dinamicamente.
- [x] 2.4 Mantener compatibilidad transitoria con disponibilidades puntuales.

## 3. UI

- [x] 3.1 Crear pantalla de `Horarios medicos`.
- [x] 3.2 Crear pantalla de `Bloqueos y feriados`.
- [x] 3.3 Adaptar Agenda Diaria para mostrar slots recurrentes y bloqueados.
- [x] 3.4 Adaptar alta rapida y nuevo turno para usar slots recurrentes.
- [x] 3.5 Agregar bandeja `Turnos a resolver`.
- [x] 3.6 Permitir al medico crear bloqueos solo sobre su propia agenda.

## 4. Permissions

- [x] 4.1 Definir permisos para administrar horarios medicos.
- [x] 4.2 Definir permisos para administrar bloqueos.
- [x] 4.3 Validar que medico no pueda bloquear agendas ajenas.

## 5. Validation

- [x] 5.1 Actualizar seeds de testing con reglas semanales y bloqueos.
- [x] 5.2 Actualizar pruebas Playwright de otorgamiento de turnos.
- [x] 5.3 Agregar prueba Playwright para bloqueo con turno en conflicto.
- [x] 5.4 Ejecutar build de Next.js.
- [x] 5.5 Ejecutar pruebas Playwright relevantes.
- [x] 5.6 Validar OpenSpec.
