import assert from "node:assert/strict";
import test from "node:test";
import { additionalLocalUserNeedsCreation } from "./local-user-bootstrap.ts";

test("evita recrear un usuario adicional que ya existe localmente", async () => {
  const checked: string[] = [];
  const shouldCreate = await additionalLocalUserNeedsCreation("ddiqxk2q17zfy2a", async (id) => {
    checked.push(id);
    return true;
  });

  assert.equal(shouldCreate, false);
  assert.deepEqual(checked, ["ddiqxk2q17zfy2a"]);
});

test("permite crear un usuario adicional ausente", async () => {
  const shouldCreate = await additionalLocalUserNeedsCreation("ddiqxk2q17zfy2a", async () => false);
  assert.equal(shouldCreate, true);
});
