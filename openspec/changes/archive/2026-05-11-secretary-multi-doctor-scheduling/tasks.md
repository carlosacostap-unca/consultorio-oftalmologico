# Tareas

## 1. Especificacion

- [x] 1.1 Documentar medicos agendables como usuarios con rol `medico`.
- [x] 1.2 Documentar agenda multi-medico para secretaria.
- [x] 1.3 Documentar asociacion de `medico_id` en disponibilidades y turnos.

## 2. Modelo de datos

- [x] 2.1 Agregar campo relacion `medico_id` en `disponibilidades` apuntando a `users`.
- [x] 2.2 Agregar campo relacion `medico_id` en `turnos` apuntando a `users`.
- [x] 2.3 Crear migracion o script de normalizacion para datos existentes.
- [x] 2.4 Definir estrategia para registros existentes cuando haya mas de un medico posible.

## 3. Carga de datos

- [x] 3.1 Cargar usuarios con rol `medico` para las pantallas de turnos.
- [x] 3.2 Cargar disponibilidades expandiendo `medico_id`.
- [x] 3.3 Cargar turnos expandiendo `medico_id` y `paciente_id`.

## 4. Interfaz de secretaria

- [x] 4.1 Agregar selector de medico con opcion `Todos los medicos` en `/turnos`.
- [x] 4.2 Filtrar agenda diaria, semanal, lista y disponibilidades por medico seleccionado.
- [x] 4.3 Mostrar el medico en turnos y disponibilidades cuando se usa `Todos los medicos`.
- [x] 4.4 Pedir medico primero al crear disponibilidad.
- [x] 4.5 Pedir medico primero al crear turno desde flujo general.
- [x] 4.6 Preseleccionar medico al crear turno desde una disponibilidad.

## 5. Reglas por rol activo

- [x] 5.1 Para rol activo `secretaria`, permitir gestionar todas las agendas medicas.
- [x] 5.2 Para rol activo `medico`, prefiltrar por el medico autenticado.
- [x] 5.3 Evitar que un medico cree o edite turnos de otro medico salvo que tenga rol activo `secretaria` o `admin`.

## 6. Verificacion

- [x] 6.1 Validar OpenSpec.
- [x] 6.2 Ejecutar lint enfocado en archivos tocados.
- [x] 6.3 Ejecutar build.
- [x] 6.4 Verificar manualmente flujo secretaria con dos medicos.
- [x] 6.5 Verificar manualmente flujo medico con agenda propia.
