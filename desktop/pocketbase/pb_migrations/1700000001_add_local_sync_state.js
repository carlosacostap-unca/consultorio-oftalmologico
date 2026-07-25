migrate((app) => {
  const operations = new Collection({
    type: "base",
    name: "sync_operations",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: null,
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      { name: "operation_id", type: "text", required: true },
      { name: "entity", type: "select", required: true, maxSelect: 1, values: ["pacientes", "consultas", "recetas"] },
      { name: "record_id", type: "text", required: true },
      { name: "action", type: "select", required: true, maxSelect: 1, values: ["create", "update", "delete"] },
      { name: "payload", type: "json", required: true },
      { name: "base_snapshot", type: "json" },
      { name: "changed_fields", type: "json" },
      { name: "dependencies", type: "json" },
      { name: "actor_id", type: "text", required: true },
      { name: "device_id", type: "text", required: true },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["pending", "sending", "confirmed", "conflict", "error"] },
      { name: "attempts", type: "number", min: 0 },
      { name: "next_attempt_at", type: "date" },
      { name: "last_error", type: "text", max: 1000 },
      { name: "queued_at", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_local_operation_id` ON `sync_operations` (`operation_id`)",
      "CREATE INDEX `idx_local_operation_queue` ON `sync_operations` (`status`, `queued_at`)",
    ],
  });
  app.save(operations);

  const cursors = new Collection({
    type: "base",
    name: "sync_cursors",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      { name: "collection", type: "text", required: true },
      { name: "updated", type: "text" },
      { name: "record_id", type: "text" },
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_local_cursor_collection` ON `sync_cursors` (`collection`)"],
  });
  app.save(cursors);

  const runtimeState = new Collection({
    type: "base",
    name: "sync_runtime_state",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      { name: "key", type: "text", required: true },
      { name: "value", type: "json" },
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_local_runtime_key` ON `sync_runtime_state` (`key`)"],
  });
  app.save(runtimeState);

  const localConflicts = new Collection({
    type: "base",
    name: "sync_local_conflicts",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      { name: "conflict_id", type: "text", required: true },
      { name: "operation_id", type: "text", required: true },
      { name: "entity", type: "select", required: true, maxSelect: 1, values: ["pacientes", "consultas", "recetas"] },
      { name: "record_id", type: "text", required: true },
      { name: "local_snapshot", type: "json" },
      { name: "central_snapshot", type: "json" },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["open", "resolved", "discarded"] },
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_local_conflict_id` ON `sync_local_conflicts` (`conflict_id`)"],
  });
  app.save(localConflicts);
}, (app) => {
  for (const name of ["sync_local_conflicts", "sync_runtime_state", "sync_cursors", "sync_operations"]) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch {
      // Permite rollback idempotente durante desarrollo.
    }
  }
});
