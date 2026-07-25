onRecordCreateRequest((e) => {
  const info = e.requestInfo();
  const headers = info.headers || {};
  if (String(headers.x_consultorio_sync_origin || "") === "central") return e.next();
  const actorId = info.auth && !info.auth.isSuperuser()
    ? info.auth.id
    : String(headers.x_consultorio_actor_id || "");
  const deviceId = String(headers.x_consultorio_device_id || "");
  if (!actorId || !deviceId) throw new BadRequestError("La operacion offline requiere usuario y dispositivo identificados.");

  e.next();
  const operation = new Record(e.app.findCollectionByNameOrId("sync_operations"));
  operation.set("operation_id", String(headers.x_consultorio_operation_id || "") || $security.randomString(32));
  operation.set("entity", e.collection.name);
  operation.set("record_id", e.record.id);
  operation.set("action", "create");
  operation.set("payload", e.record.publicExport());
  operation.set("base_snapshot", {});
  operation.set("changed_fields", Object.keys(info.body || {}).filter((name) => !["created", "updated", "collectionId", "collectionName", "expand"].includes(name) && !name.endsWith("+")));
  operation.set("dependencies", []);
  operation.set("actor_id", actorId);
  operation.set("device_id", deviceId);
  operation.set("status", "pending");
  operation.set("attempts", 0);
  e.app.save(operation);
}, "pacientes", "consultas", "recetas");

onRecordUpdateRequest((e) => {
  const info = e.requestInfo();
  const headers = info.headers || {};
  if (String(headers.x_consultorio_sync_origin || "") === "central") return e.next();
  const actorId = info.auth && !info.auth.isSuperuser()
    ? info.auth.id
    : String(headers.x_consultorio_actor_id || "");
  const deviceId = String(headers.x_consultorio_device_id || "");
  if (!actorId || !deviceId) throw new BadRequestError("La operacion offline requiere usuario y dispositivo identificados.");
  const baseSnapshot = e.record.original().publicExport();

  e.next();
  const operation = new Record(e.app.findCollectionByNameOrId("sync_operations"));
  operation.set("operation_id", String(headers.x_consultorio_operation_id || "") || $security.randomString(32));
  operation.set("entity", e.collection.name);
  operation.set("record_id", e.record.id);
  operation.set("action", e.record.getBool("sync_deleted") ? "delete" : "update");
  operation.set("payload", e.record.publicExport());
  operation.set("base_snapshot", baseSnapshot);
  operation.set("changed_fields", Object.keys(info.body || {}).filter((name) => !["created", "updated", "collectionId", "collectionName", "expand"].includes(name) && !name.endsWith("+")));
  operation.set("dependencies", []);
  operation.set("actor_id", actorId);
  operation.set("device_id", deviceId);
  operation.set("status", "pending");
  operation.set("attempts", 0);
  e.app.save(operation);
}, "pacientes", "consultas", "recetas");

onRecordDeleteRequest((e) => {
  const headers = e.requestInfo().headers || {};
  if (String(headers.x_consultorio_sync_origin || "") === "central") return e.next();
  throw new BadRequestError("La aplicacion de escritorio usa baja logica; actualice sync_deleted en lugar de borrar el registro.");
}, "pacientes", "consultas", "recetas");
