import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithAdminAuth } from "./pocketbase-admin-request.ts";
import { ADMIN_TOKEN_REFRESH_SKEW_MS, isAdminTokenReusable } from "./pocketbase-admin-token.ts";

const NOW_MS = Date.UTC(2026, 7, 31, 12, 0, 0);

function unsignedToken(payload: Record<string, unknown>) {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedHeader}.${encodedPayload}.test-signature`;
}

test("reutiliza un token administrativo con vigencia posterior al margen preventivo", () => {
  const token = unsignedToken({ exp: (NOW_MS + ADMIN_TOKEN_REFRESH_SKEW_MS + 1_000) / 1000 });

  assert.equal(isAdminTokenReusable(token, NOW_MS), true);
});

test("renueva un token administrativo que vence dentro del margen preventivo", () => {
  const token = unsignedToken({ exp: (NOW_MS + ADMIN_TOKEN_REFRESH_SKEW_MS) / 1000 });

  assert.equal(isAdminTokenReusable(token, NOW_MS), false);
});

test("renueva un token administrativo vencido", () => {
  const token = unsignedToken({ exp: (NOW_MS - 1_000) / 1000 });

  assert.equal(isAdminTokenReusable(token, NOW_MS), false);
});

test("no reutiliza tokens administrativos sin expiracion verificable", () => {
  assert.equal(isAdminTokenReusable(unsignedToken({}), NOW_MS), false);
  assert.equal(isAdminTokenReusable(unsignedToken({ exp: "invalid" }), NOW_MS), false);
  assert.equal(isAdminTokenReusable("token-malformado", NOW_MS), false);
  assert.equal(isAdminTokenReusable("", NOW_MS), false);
});

for (const rejectedStatus of [401, 403]) {
  test(`renueva un token rechazado con ${rejectedStatus} y reintenta la operacion una vez`, async () => {
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
        return Response.json(
          { message: "The request requires valid authentication." },
          { status: rejectedStatus },
        );
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
}
