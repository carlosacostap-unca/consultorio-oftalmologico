## 1. Datos y utilidades

- [x] 1.1 Revisar `app/turnos/nuevo/page.tsx` y extraer helpers locales para horarios, solapamientos y etiquetas de medico.
- [x] 1.2 Cargar turnos existentes del medico y dia seleccionados para calcular horarios ocupados.
- [x] 1.3 Agregar o ajustar datos demo de pacientes/disponibilidades/turnos para pruebas reproducibles.

## 2. Flujo guiado de alta de turno

- [x] 2.1 Reordenar el formulario para que medico y fecha sean el primer paso visible.
- [x] 2.2 Bloquear disponibilidad y horarios hasta tener medico y fecha.
- [x] 2.3 Mostrar tarjetas o botones de disponibilidad disponibles para el medico y dia.
- [x] 2.4 Calcular y mostrar intervalos libres/ocupados dentro de la disponibilidad elegida.
- [x] 2.5 Al elegir horario libre, completar hora, duracion, tipo y disponibilidad.
- [x] 2.6 Mantener busqueda, alta rapida y edicion rapida de paciente dentro del flujo.

## 3. Sobreturnos y validaciones

- [x] 3.1 Permitir sobreturno explicito cuando se elige horario ocupado o fuera de bloque.
- [x] 3.2 Validar antes de guardar medico, fecha, horario, paciente y disponibilidad cuando corresponda.
- [x] 3.3 Bloquear turno regular si el horario esta ocupado para el mismo medico.
- [x] 3.4 Preservar `medico_id` en turnos y sobreturnos creados desde enlaces de agenda.

## 4. Navegacion y roles

- [x] 4.1 Verificar que `/turnos` reacciona al cambio de rol activo sin recargar.
- [x] 4.2 Verificar que `/turnos/nuevo` respeta rol activo medico y bloquea otros medicos.
- [x] 4.3 Volver a `/turnos` preservando contexto de medico o pestaña cuando aplique.

## 5. Pruebas automatizadas

- [x] 5.1 Crear prueba Playwright para login de secretaria y visibilidad de todos los medicos.
- [x] 5.2 Crear prueba Playwright para usuario multi rol: ingreso como medico y cambio a secretaria.
- [x] 5.3 Crear prueba Playwright para flujo de secretaria otorgando turno con datos demo.
- [x] 5.4 Documentar comando para ejecutar la suite de pruebas.

## 6. Verificacion

- [x] 6.1 Validar OpenSpec del cambio.
- [x] 6.2 Ejecutar lint enfocado en archivos tocados.
- [x] 6.3 Ejecutar build.
- [x] 6.4 Ejecutar pruebas Playwright automatizadas.
