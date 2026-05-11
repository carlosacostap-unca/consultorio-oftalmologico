# Agenda multi-medico para secretaria

## Resumen
Redisenar el proceso de otorgamiento de turnos para que la secretaria trabaje sobre una agenda multi-medico. La secretaria podra gestionar todas las agendas, filtrar por medico y otorgar turnos vinculando cada disponibilidad y cada turno a un usuario con rol `medico`.

## Problema
La agenda actual administra turnos y disponibilidades sin identificar claramente a que medico pertenecen. Esto funciona para un consultorio con un unico profesional, pero genera ambiguedad cuando la secretaria necesita coordinar turnos de mas de un medico.

Ademas, la pantalla de turnos mezcla vistas operativas sin un punto de entrada pensado para el flujo real de secretaria: elegir medico, revisar disponibilidad, buscar o crear paciente y otorgar turno.

## Objetivos
- Definir que un medico agendable es un usuario con rol `medico`.
- Asociar cada disponibilidad a un medico.
- Asociar cada turno a un medico.
- Permitir que la secretaria gestione todas las agendas medicas.
- Agregar filtro de medico con opcion `Todos los medicos`.
- Hacer que la creacion de disponibilidades y turnos pida medico como decision temprana.
- Mantener el alcance en agenda y otorgamiento de turnos, sin abordar recordatorios, lista de espera ni permisos por secretaria.

## Fuera de alcance
- Asignar secretarias a medicos especificos.
- Crear una entidad separada de profesionales.
- Automatizar confirmaciones por WhatsApp, email o SMS.
- Gestionar lista de espera.
- Redisenar el flujo clinico de consultas.

## Impacto esperado
- La secretaria tendra una pantalla de turnos mas clara para operar multiples agendas.
- Los medicos podran tener agenda propia filtrada por su usuario.
- La base de datos ganara trazabilidad de medico en disponibilidades y turnos.
- Las vistas existentes de agenda diaria, semanal, lista y disponibilidades deberan mostrar o filtrar por medico.
