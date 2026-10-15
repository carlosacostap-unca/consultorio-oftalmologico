// PocketBase ejecuta los hooks en Goja, cuyo cargador de módulos usa require.
/* eslint-disable @typescript-eslint/no-require-imports */
onRecordCreateRequest((e) => {
  return require(`${__hooks}/sync_queue.js`).persistWithQueue(e, "create");
}, "pacientes", "consultas", "recetas");

onRecordUpdateRequest((e) => {
  return require(`${__hooks}/sync_queue.js`).persistWithQueue(e, "update");
}, "pacientes", "consultas", "recetas");

onRecordDeleteRequest(() => {
  throw new BadRequestError("La aplicacion de escritorio conserva los registros; use una baja logica en lugar de borrar el registro.");
}, "pacientes", "consultas", "recetas");
