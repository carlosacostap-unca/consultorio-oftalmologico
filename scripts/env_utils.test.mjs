import assert from "node:assert/strict";
import test from "node:test";
import { mergeEnvValues } from "./env_utils.mjs";

test("combina credenciales de runtime con valores opcionales de archivo", () => {
  const values = mergeEnvValues(
    {
      POCKETBASE_URL: "https://runtime.example.test",
      POCKETBASE_ADMIN_EMAIL: "admin@example.test",
      POCKETBASE_ADMIN_PASSWORD: "runtime-secret",
    },
    {
      POCKETBASE_URL: "https://file.example.test",
    },
  );

  assert.equal(values.POCKETBASE_URL, "https://file.example.test");
  assert.equal(values.POCKETBASE_ADMIN_EMAIL, "admin@example.test");
  assert.equal(values.POCKETBASE_ADMIN_PASSWORD, "runtime-secret");
});
