const PB_URL = (process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || "").replace(/\/$/, "");

let cachedAdminToken = process.env.POCKETBASE_ADMIN_TOKEN || "";

export async function pbAdmin(path: string, options: RequestInit = {}) {
  if (!PB_URL) {
    throw new Error("POCKETBASE_URL no configurada");
  }

  const token = await adminToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${PB_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PocketBase ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export async function authenticatedUser(request: Request) {
  if (!PB_URL) {
    throw new Error("POCKETBASE_URL no configurada");
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return null;
  }

  const response = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.record || null;
}

export async function requireAdmin(request: Request) {
  const user = await authenticatedUser(request);
  return user?.role === "admin" ? user : null;
}

async function adminToken() {
  if (cachedAdminToken) {
    return cachedAdminToken;
  }

  const identity = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (!identity || !password) {
    throw new Error("Credenciales admin de PocketBase no configuradas");
  }

  const body = JSON.stringify({ identity, password });
  let response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    response = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  }

  if (!response.ok) {
    throw new Error(`No se pudo autenticar en PocketBase: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  cachedAdminToken = data.token || "";
  return cachedAdminToken;
}
