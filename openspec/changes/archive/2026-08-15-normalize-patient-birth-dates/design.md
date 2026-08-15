## Context

`pacientes.fecha_nacimiento` se almacena en PocketBase como fecha/hora, aunque semanticamente representa solo un dia de nacimiento. La aplicacion ya guarda algunas altas a `12:00:00Z`, pero la edicion de pacientes y altas rapidas desde turnos pueden reenviar `YYYY-MM-DD` o valores sin normalizar. Ademas, el calculo de edad en consultas usa `new Date(fechaNacimiento)`, que interpreta cadenas UTC y puede mostrar un dia anterior en zonas GMT-3.

El diagnostico productivo encontro 37 pacientes con `fecha_nacimiento` exactamente en `00:00:00.000Z`, 63.413 ya normalizados a `12:00:00.000Z` y 408 sin fecha de nacimiento cargada.

## Goals / Non-Goals

**Goals:**
- Preservar el mismo dia de nacimiento en cualquier rol o pantalla.
- Normalizar nuevas escrituras de fecha de nacimiento a mediodia UTC.
- Calcular edad desde la fecha calendario, sin depender de la conversion horaria del navegador.
- Proveer una migracion reversible por respaldo y no destructiva por defecto.

**Non-Goals:**
- No corregir anos legacy imposibles o incompletos detectados en algunos pacientes.
- No cambiar el esquema PocketBase.
- No aplicar la normalizacion productiva sin confirmacion explicita del usuario.

## Decisions

- Crear un helper compartido `patient-birth-date` para extraer claves `YYYY-MM-DD`, formatear entrada `dd/mm/aaaa`, convertir a almacenamiento `T12:00:00.000Z` y calcular edad.
- Preferir la clave textual inicial `YYYY-MM-DD` cuando el dato ya viene desde PocketBase, evitando reinterpretar medianoche UTC.
- En edicion y altas rapidas, convertir `YYYY-MM-DD` a `YYYY-MM-DDT12:00:00.000Z` antes de enviar a PocketBase.
- Mantener la entrada `dd/mm/aaaa` en el alta principal de pacientes, reutilizando el helper existente para no duplicar validacion.
- Agregar un script con dry-run por defecto; `--apply` requiere `--confirm=CONFIRMO_NORMALIZAR_FECHAS_NACIMIENTO`.

## Risks / Trade-offs

- [Risk] Fechas legacy con anos invalidos seguiran siendo visibles como fueron cargadas. Mitigation: este cambio solo corrige el corrimiento horario; la depuracion de calidad de datos debe abordarse aparte con reglas clinicas/administrativas.
- [Risk] Algunos flujos no cargan fecha de nacimiento. Mitigation: el helper conserva valores vacios y no fuerza datos ausentes.
- [Risk] Una ejecucion de migracion productiva podria fallar parcialmente. Mitigation: el script genera reporte, respaldo previo al apply y conteo de remanentes.
