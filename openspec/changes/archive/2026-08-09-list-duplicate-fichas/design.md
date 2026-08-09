## Context

La aplicacion ya cuenta con una pantalla admin de pacientes duplicados y una seccion de menu "Calidad de datos". Tambien existen antecedentes operativos para detectar fichas repetidas agrupando pacientes activos por `pacientes.numero_ficha` en PocketBase.

## Goals / Non-Goals

**Goals:**
- Exponer a usuarios admin una pantalla de solo lectura para revisar fichas con mas de un paciente activo asignado.
- Mantener la autorizacion del lado servidor mediante `requireAdmin`.
- Reutilizar App Router, `pbAdmin`, `activeRoleJsonHeaders` y los patrones visuales existentes.
- Permitir una accion administrativa controlada para reemplazar las consultas de un paciente por las consultas legacy de su ficha en `DATOMED.DBF`.
- Permitir separar un paciente de una ficha duplicada con una nueva ficha generada por la misma politica del alta de paciente.

**Non-Goals:**
- No fusionar pacientes desde esta pantalla.
- No cambiar el esquema de PocketBase ni los scripts de importacion.
- No generar exportacion o impresion en esta iteracion.

## Decisions

- La consulta sera un Route Handler `GET /api/pacientes/fichas-duplicadas` protegido por `requireAdmin`.
  - Alternativa considerada: consultar PocketBase directamente desde el cliente. Se descarta porque expondria reglas de agrupacion y dependeria de permisos de cliente.
- El agrupamiento se hara en la API paginando pacientes activos y normalizando `numero_ficha` con trim.
  - Alternativa considerada: usar un reporte CSV preexistente. Se descarta porque la pantalla debe reflejar el estado actual de PocketBase.
- La cantidad de consultas se calculara desde la coleccion `consultas`, agrupando por `paciente_id` para los pacientes incluidos en fichas duplicadas.
  - Alternativa considerada: contar consulta por paciente con una llamada por fila. Se evita para no degradar una pantalla con cientos de pacientes.
- La accion "Queda" sera un `POST /api/pacientes/fichas-duplicadas` protegido por `requireAdmin`.
  - Alternativa considerada: hacer la importacion desde el cliente. Se descarta porque requiere leer `DATOMED.DBF`, borrar registros y usar credenciales admin.
- La accion "Separar" usara el mismo `POST`, con un modo explicito que primero toma las consultas de la ficha actual desde `DATOMED.DBF`, luego obtiene el siguiente numero de ficha con la misma funcion usada por `/api/pacientes/ficha`, actualiza `pacientes.numero_ficha` y crea las copias de consultas con esa nueva ficha.
  - Alternativa considerada: calcular la nueva ficha en cliente. Se descarta porque la politica debe ser unica y server-side.
- La importacion leera `data/DATOMED.DBF` en el servidor, filtrara por `NUM_FICH` normalizado contra la ficha actual del paciente y creara consultas con `paciente_id` del paciente elegido.
  - Alternativa considerada: reutilizar `consultas-plan.jsonl` generado en reportes. Se descarta porque la solicitud nombra el DBF como fuente directa.
- Antes de eliminar consultas actuales se generara un respaldo local JSON con consultas y eventos asociados cuando el entorno permita escritura en `data/backups`.
  - Alternativa considerada: borrar sin respaldo. Se descarta por ser una accion irreversible sobre datos clinicos.
- La pantalla sera un Client Component que valida sesion y rol activo igual que `/pacientes/duplicados`.
  - Alternativa considerada: Server Component. Se descarta para mantener consistencia con el auth store del cliente y el header de rol activo usado por los endpoints admin.

## Risks / Trade-offs

- [Coleccion grande] La API debe recorrer pacientes activos para agrupar fichas -> usar paginacion y limitar campos solicitados.
- [Conteos de consultas] Un filtro demasiado largo sobre `consultas` puede fallar -> consultar en lotes de pacientes con concurrencia acotada.
- [Accion destructiva] El usuario puede elegir el paciente equivocado -> mostrar confirmacion explicita con paciente y ficha antes de ejecutar.
- [Importacion parcial] Puede fallar una creacion luego de borrar consultas -> respaldar datos previos y devolver conteos/errores claros.
- [Ficha nueva ocupada por carrera] La ficha calculada podria ocuparse entre calculo y actualizacion -> verificar duplicado antes de actualizar y fallar con error si no hay ficha disponible.
- [Datos inconsistentes] Fichas vacias o espacios no deben aparecer como duplicadas -> normalizar y descartar valores vacios.
- [Acceso indebido] Ocultar el menu no alcanza -> validar rol activo `admin` en el endpoint y en la pantalla.
