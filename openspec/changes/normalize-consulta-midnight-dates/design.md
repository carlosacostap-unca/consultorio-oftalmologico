## Context

La correccion de aplicacion ya guarda nuevas fechas clinicas de consulta a mediodia UTC. El diagnostico de produccion encontro 174 consultas existentes con `fecha` a `00:00:00.000Z`, y no encontro consultas a `01:xx` ni `02:xx` UTC.

## Goals / Non-Goals

**Goals:**
- Normalizar solamente las consultas con `fecha` a medianoche UTC exacta.
- Mantener el dia clinico original, cambiando unicamente la hora a `12:00:00.000Z`.
- Proveer dry-run, backup, reporte y verificacion post-aplicacion.

**Non-Goals:**
- No corregir fechas clinicas historicas aparentemente invalidas de importaciones legacy.
- No tocar recetas, turnos, disponibilidades ni otros campos.
- No ejecutar cambios sin confirmacion explicita del operador.

## Decisions

- El script usara el mismo patron de scripts administrativos existentes: carga `.env.local`, autentica con token o credenciales admin, y usa la API REST de PocketBase.
- La seleccion de registros se limitara con filtro `fecha ~ " 00:00:00"`, y el script validara cada registro localmente antes de incluirlo.
- `--apply` requerira `--confirm=CONFIRMO_NORMALIZAR_FECHAS_CONSULTAS` para evitar ejecuciones accidentales.
- Antes de aplicar, el script escribira un backup completo de los registros objetivo bajo `data/backups/normalizar-consultas-fecha-medianoche/`.

## Risks / Trade-offs

- [Risk] El filtro de PocketBase podria traer falsos positivos textuales -> Mitigation: validar cada `fecha` con parser antes de actualizar.
- [Risk] Una aplicacion parcial podria dejar subset normalizado -> Mitigation: escribir backup y reporte de resultado con exitos y fallos.
- [Risk] Actualizar registros clinicos reales es sensible -> Mitigation: dry-run obligatorio para revisar conteos y confirmacion explicita para `--apply`.
