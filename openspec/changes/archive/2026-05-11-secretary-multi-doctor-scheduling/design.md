# Diseno

## Modelo conceptual

Un medico agendable es un registro de `users` que incluye `medico` en su campo `roles`.

```text
users
  id
  name
  email
  roles: ["medico"]

disponibilidades
  medico_id -> users.id
  fecha_hora_inicio
  fecha_hora_fin
  tipo

turnos
  medico_id -> users.id
  disponibilidad_id -> disponibilidades.id
  paciente_id -> pacientes.id
  fecha_hora
  tipo
  estado
  motivo
  observaciones
```

## Reglas de dominio

- Cada disponibilidad debe pertenecer a un medico.
- Cada turno debe pertenecer a un medico.
- Cuando un turno se crea desde una disponibilidad, hereda el `medico_id` de esa disponibilidad.
- La secretaria puede ver y gestionar todos los medicos.
- El medico, cuando trabaje con rol activo `medico`, deberia ver por defecto su propia agenda.
- La opcion `Todos los medicos` permite revisar una agenda consolidada.

## Flujo de secretaria

```text
Secretaria abre Turnos
        |
        v
Selecciona medico o "Todos los medicos"
        |
        v
Elige fecha y vista
        |
        +-- Crear disponibilidad
        |       |
        |       v
        |   Selecciona medico primero
        |       |
        |       v
        |   Define fecha, horario y tipo
        |
        +-- Otorgar turno
                |
                v
            Selecciona medico
                |
                v
            Selecciona disponibilidad/horario
                |
                v
            Busca o crea paciente
                |
                v
            Completa motivo/observaciones
                |
                v
            Confirma turno
```

## Interfaz propuesta

La pantalla `/turnos` se mantiene como mesa de trabajo principal para secretaria.

```text
Gestion de Turnos                                      + Nuevo Turno
Agenda y administra las citas medicas

Medico [ Todos los medicos v ]  Fecha [ Hoy ]  Tipo [ Todos ]

Agenda Semanal | Agenda Diaria | Lista | Disponibilidades

Contenido segun vista:
- Si hay un medico seleccionado: agenda de ese medico.
- Si esta "Todos los medicos": agenda consolidada con medico visible en cada bloque.
```

### Creacion de disponibilidad

El formulario de disponibilidad debe pedir `Medico` antes que fecha y horario.

```text
Nueva Disponibilidad
Medico        [ Dra. Gomez v ]
Fecha         [ 25/03/2026 ]
Hora inicio   [ 08:00 ]
Hora fin      [ 12:00 ]
Tipo          [ Consulta v ]
```

### Otorgamiento de turno

Al crear turno desde una disponibilidad, el medico queda preseleccionado y bloqueado si corresponde. Si se crea desde el boton general `Nuevo Turno`, la secretaria primero debe elegir medico y luego disponibilidad/horario.

## Migracion de datos

Se necesitara una migracion para agregar `medico_id` a `disponibilidades` y `turnos`.

Para datos existentes:
- Si hay un unico usuario con rol `medico`, se puede asignar automaticamente.
- Si hay mas de un usuario con rol `medico`, la migracion no debe adivinar; debe requerir una asignacion explicita o dejar los registros marcados como pendientes de revision.

## Riesgos

- Los turnos existentes sin `paciente_id` pueden confundirse con turnos otorgados. Conviene revisar si representan turnos reales, slots precreados o datos incompletos.
- Si un usuario tiene roles `medico` y `secretaria`, la agenda debe respetar el rol activo.
- La vista `Todos los medicos` puede saturarse visualmente si se agregan mas profesionales; por ahora el alcance contempla pocos medicos.
