## Context

Las consultas ya tienen un estado operativo y el medico puede guardar avances como `en_curso`. Hoy no existe una superficie enfocada para retomar esos avances: el medico debe recordar el paciente o buscar en el historial general de consultas.

## Goals / Non-Goals

**Goals:**
- Mostrar al medico consultas `en_curso` en una bandeja operativa dentro de su flujo diario.
- Permitir retomar una consulta con una accion directa.
- Mostrar informacion suficiente para reconocer la atencion: paciente, fecha, motivo y estado.
- Mantener el comportamiento actual de la agenda diaria y el listado general de consultas.

**Non-Goals:**
- No implementar asignacion de medico en consultas si el schema aun no lo modela.
- No crear notificaciones ni alertas fuera de la pantalla.
- No cambiar la regla de edicion de consultas finalizadas.
- No agregar nuevo schema de PocketBase.

## Decisions

- Ubicar la bandeja en `/turnos` cuando el rol activo es `medico`, cerca del tablero diario, porque es el lugar donde el medico ya inicia y continua atenciones.
- Consultar `consultas` con `estado = "en_curso"` y expandir `paciente_id` para mostrar datos humanos sin endpoint nuevo.
- Ordenar por fecha descendente y limitar la bandeja a un numero acotado para que funcione como lista operativa, no como historial.
- Usar `/consultas/<id>` como destino de retomada para conservar el flujo editable existente.
- Para esta etapa, mostrar todas las consultas en curso accesibles al usuario autenticado; cuando exista asociacion explicita consulta-medico, se podra filtrar por medico.

## Risks / Trade-offs

- [Consultas en curso de otros medicos] -> La etapa actual no tiene campo medico en `consultas`; se evita inventar modelo y se documenta como ajuste futuro.
- [Carga adicional en la agenda] -> La consulta es acotada y se limita por cantidad.
- [Consultas historicas sin paciente expandido] -> La UI debe degradar a "Paciente no encontrado" sin romper la bandeja.
