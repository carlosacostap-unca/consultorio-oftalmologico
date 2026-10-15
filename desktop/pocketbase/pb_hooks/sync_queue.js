// La escritura clínica y su cola comparten transacción. Una escritura central
// comprueba la misma cola dentro de esa transacción antes de sustituir datos.
module.exports.persistWithQueue = (e, action) => {
  const info = e.requestInfo();
  const headers = info.headers || {};
  const central = String(headers.x_consultorio_sync_origin || "") === "central";
  const actorId = info.auth && !info.auth.isSuperuser()
    ? info.auth.id : String(headers.x_consultorio_actor_id || "");
  const deviceId = String(headers.x_consultorio_device_id || "");
  if (!central && (!actorId || !deviceId)) {
    throw new BadRequestError("La operacion offline requiere usuario y dispositivo identificados.");
  }
  const baseSnapshot = action === "update" ? e.record.original().publicExport() : {};
  const originalApp = e.app;
  return originalApp.runInTransaction((txApp) => {
    e.app = txApp;
    try {
      if (central) {
        const acknowledged = String(headers.x_consultorio_acknowledged_operation || "");
        const pending = txApp.findRecordsByFilter("sync_operations",
          "entity = {:entity} && record_id = {:recordId} && status != 'confirmed' && operation_id != {:acknowledged}",
          "", 1, 0, { entity: e.collection.name, recordId: e.record.id, acknowledged });
        if (pending.length > 0) {
          throw new BadRequestError("Se conserva la version local: hay operaciones sin confirmar.", {
            sync_local_pending: new ValidationError("sync_local_pending", "Hay operaciones locales sin confirmar."),
          });
        }
        return e.next();
      }

      e.next();
      const operation = new Record(txApp.findCollectionByNameOrId("sync_operations"));
      operation.set("operation_id", String(headers.x_consultorio_operation_id || "") || $security.randomString(32));
      operation.set("entity", e.collection.name);
      operation.set("record_id", e.record.id);
      operation.set("action", action === "update" && e.record.getBool("sync_deleted") ? "delete" : action);
      operation.set("payload", e.record.publicExport());
      operation.set("base_snapshot", baseSnapshot);
      operation.set("changed_fields", Object.keys(info.body || {}).filter((name) => !["created", "updated", "collectionId", "collectionName", "expand"].includes(name) && !name.endsWith("+")));
      operation.set("dependencies", []);
      operation.set("actor_id", actorId);
      operation.set("device_id", deviceId);
      operation.set("status", "pending");
      operation.set("attempts", 0);
      txApp.save(operation);
    } finally {
      e.app = originalApp;
    }
  });
};
