import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithAdminAuth } from "./pocketbase-admin-request.ts";

test("renueva un token expirado y reintenta la operacion una vez", async () => {
  const requests: Array<{ authorization: string | null; path: string }> = [];
  const tokens = ["expired-admin-token", "fresh-admin-token"];
  let invalidations = 0;

  const fetcher = (async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    requests.push({
      authorization: headers.get("authorization"),
      path: url.pathname,
    });

    if (url.pathname === "/api/collections/users/records" && requests.length === 1) {
      return Response.json({ message: "The request requires valid authentication." }, { status: 401 });
    }

    if (url.pathname === "/api/collections/users/records") {
      return Response.json({ items: [{ id: "user-1", email: "admin@example.test" }] });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  const response = await fetchWithAdminAuth({
    fetcher,
    getToken: async () => tokens.shift() || "",
    invalidateToken: () => {
      invalidations += 1;
    },
    url: "https://pocketbase.example.test/api/collections/users/records",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    items: [{ id: "user-1", email: "admin@example.test" }],
  });
  assert.equal(invalidations, 1);
  assert.deepEqual(requests, [
    {
      authorization: "Bearer expired-admin-token",
      path: "/api/collections/users/records",
    },
    {
      authorization: "Bearer fresh-admin-token",
      path: "/api/collections/users/records",
    },
  ]);
});
